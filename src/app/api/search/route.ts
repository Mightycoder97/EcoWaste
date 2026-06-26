import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { latitude, longitude, radius = 5000, types = ['hospital', 'clinic', 'laboratory', 'dentist', 'veterinary'] } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Se requieren latitud y longitud.' }, { status: 400 });
    }

    // Construir consulta Overpass QL según los tipos seleccionados
    let subqueries = '';
    const rad = Math.min(Math.max(radius, 500), 50000); // Limitar radio entre 500m y 50km

    types.forEach((t: string) => {
      if (t === 'hospital') {
        subqueries += `node["amenity"="hospital"](around:${rad}, ${latitude}, ${longitude});`;
        subqueries += `way["amenity"="hospital"](around:${rad}, ${latitude}, ${longitude});`;
      } else if (t === 'clinic') {
        subqueries += `node["amenity"="clinic"](around:${rad}, ${latitude}, ${longitude});`;
        subqueries += `way["amenity"="clinic"](around:${rad}, ${latitude}, ${longitude});`;
        subqueries += `node["healthcare"="clinic"](around:${rad}, ${latitude}, ${longitude});`;
      } else if (t === 'laboratory') {
        subqueries += `node["healthcare"="laboratory"](around:${rad}, ${latitude}, ${longitude});`;
        subqueries += `node["healthcare"="centre"](around:${rad}, ${latitude}, ${longitude});`;
      } else if (t === 'dentist') {
        subqueries += `node["amenity"="dentist"](around:${rad}, ${latitude}, ${longitude});`;
        subqueries += `node["healthcare"="dentist"](around:${rad}, ${latitude}, ${longitude});`;
      } else if (t === 'veterinary') {
        subqueries += `node["amenity"="veterinary"](around:${rad}, ${latitude}, ${longitude});`;
      }
    });

    const overpassQuery = `
      [out:json][timeout:30];
      (
        ${subqueries}
      );
      out body;
      >;
      out skel qt;
    `;

    const googleKey = process.env.GOOGLE_MAPS_API_KEY || '';
    let clients: any[] = [];
    let googleFailed = false;
    let googleErrorMsg = '';

    if (googleKey.trim() !== '') {
      console.log(`[SearchAPI] Usando motor Google Places API...`);
      try {
        // Ejecutar búsquedas en paralelo por cada tipo seleccionado
        const promises = types.map(async (t: string) => {
          let typeResults: any[] = [];
          let nextPageToken = '';
          
          do {
            let url = '';
            if (nextPageToken) {
              url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${googleKey}`;
            } else {
              url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${rad}&key=${googleKey}`;
              if (t === 'hospital') {
                url += `&type=hospital`;
              } else if (t === 'clinic') {
                url += `&keyword=clinica`;
              } else if (t === 'laboratory') {
                url += `&keyword=laboratorio`;
              } else if (t === 'dentist') {
                url += `&type=dentist`;
              } else if (t === 'veterinary') {
                url += `&type=veterinary_care`;
              }
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            if (data.status === 'REQUEST_DENIED') {
              throw new Error(`REQUEST_DENIED: ${data.error_message || 'La clave de API tiene restricciones de Referer/IP y no se puede usar desde el servidor backend'}`);
            }
            
            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
              throw new Error(`Google Places API status ${data.status}`);
            }

            if (data.results) {
              typeResults = [...typeResults, ...data.results];
            }

            nextPageToken = data.next_page_token || '';

            if (nextPageToken) {
              // La API de Google requiere un pequeño retraso antes de que el token sea utilizable
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          } while (nextPageToken);

          return typeResults.map((place: any) => {
            const address = place.vicinity || place.formatted_address || 'Dirección no registrada';
            
            return {
              id: `google-${place.place_id}`,
              name: place.name,
              type: t,
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              address: address,
              phone: undefined,
              email: undefined,
              website: undefined,
              status: 'nuevo',
              waste_volume: undefined,
              waste_details: undefined,
              key_contacts: [],
              notes: undefined,
            };
          });
        });

        const resultsArray = await Promise.all(promises);
        clients = resultsArray.flat();
        console.log(`[SearchAPI] Búsqueda de Google Places finalizada con éxito. Encontrados: ${clients.length}`);
      } catch (err: any) {
        googleFailed = true;
        googleErrorMsg = err.message;
        console.warn(`[SearchAPI] Google Places API falló: ${googleErrorMsg}. Revirtiendo a motor OpenStreetMap (Overpass)...`);
      }
    }

    if (googleKey.trim() === '' || googleFailed) {
      console.log(`[SearchAPI] Iniciando motor de respaldo OpenStreetMap (Overpass)...`);
      
      const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      let response = null;
      let lastError = '';
      let data = null;

      for (const mirror of mirrors) {
        try {
          console.log(`[SearchAPI] Intentando consulta en espejo Overpass: ${mirror}`);
          response = await fetch(mirror, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'EcoWasteFinder/1.0 (contacto@ecowastefinder.cl)'
            },
            body: `data=${encodeURIComponent(overpassQuery)}`,
          });

          if (response.ok) {
            data = await response.json();
            console.log(`[SearchAPI] Éxito al conectar con espejo: ${mirror}`);
            break;
          } else {
            const status = response.status;
            lastError = `Servidor ${mirror} respondió con código ${status}`;
            console.warn(`[SearchAPI] Espejo falló: ${lastError}`);
            response = null;
          }
        } catch (err: any) {
          lastError = err.message;
          console.warn(`[SearchAPI] Error de red en espejo ${mirror}: ${lastError}`);
          response = null;
        }
      }

      if (!response || !data) {
        throw new Error(`Todos los servidores de Overpass fallaron. Último error: ${lastError}`);
      }

      const elements = data.elements || [];

      // Mapear elementos a nuestro tipo de cliente
      clients = elements
        .filter((el: any) => el.type === 'node' || (el.type === 'way' && el.center))
        .map((el: any) => {
          const tags = el.tags || {};
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;

          let type = 'clinic';
          if (tags.amenity === 'hospital') type = 'hospital';
          else if (tags.healthcare === 'laboratory') type = 'laboratory';
          else if (tags.amenity === 'dentist' || tags.healthcare === 'dentist') type = 'dentist';
          else if (tags.amenity === 'veterinary') type = 'veterinary';

          const street = tags['addr:street'] || '';
          const houseNumber = tags['addr:housenumber'] || '';
          const city = tags['addr:city'] || '';
          const fullAddress = [street, houseNumber, city].filter(Boolean).join(', ') || 'Dirección no registrada';

          let name = tags.name || tags.operator || '';
          if (!name) {
            const namesMap: Record<string, string> = {
              hospital: 'Hospital General',
              clinic: 'Centro Clínico',
              laboratory: 'Laboratorio de Análisis',
              dentist: 'Consulta Dental',
              veterinary: 'Clínica Veterinaria',
            };
            name = namesMap[type] || 'Establecimiento Médico';
          }

          return {
            id: `osm-${el.id}`,
            name: name,
            type: type,
            latitude: lat,
            longitude: lon,
            address: fullAddress,
            phone: tags.phone || tags['contact:phone'] || tags['phone:mobile'] || undefined,
            email: tags.email || tags['contact:email'] || undefined,
            website: tags.website || tags['contact:website'] || undefined,
            status: 'nuevo',
            waste_volume: undefined,
            waste_details: undefined,
            key_contacts: [],
            notes: undefined,
          };
        });
    }

    // Eliminar duplicados por ID primero (para evitar llaves duplicadas en React)
    // y luego por nombre y coordenadas similares para limpiar la UI
    const uniqueClients: any[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    clients.forEach((c: any) => {
      const nameKey = `${c.name.toLowerCase()}-${c.latitude.toFixed(4)}-${c.longitude.toFixed(4)}`;
      if (!seenIds.has(c.id) && !seenNames.has(nameKey)) {
        seenIds.add(c.id);
        seenNames.add(nameKey);
        uniqueClients.push(c);
      }
    });

    // Alertar si Google Places falló o no está configurado
    let googleMapsAlert: string | null = null;
    if (googleFailed) {
      googleMapsAlert = googleErrorMsg;
    } else if (googleKey.trim() === '') {
      googleMapsAlert = 'Google Maps API Key no configurada en el servidor. Revirtiendo a OpenStreetMap.';
    }

    return NextResponse.json({
      clients: uniqueClients,
      googleAlert: googleMapsAlert
    });
  } catch (error: any) {
    console.error('[SearchAPI] Error en búsqueda Overpass:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
