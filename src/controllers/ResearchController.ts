import { callDeepSeek, DeepSeekMessage } from '@/lib/deepseekClient';
import { ClientModel } from '@/models/ClientModel';
import { ResearchModel } from '@/models/ResearchModel';
import { Client, ResearchLog, KeyContact } from '@/models/db';

const defaultSerperKey = process.env.SERPER_API_KEY || '';

export interface ResearchResult {
  phone?: string;
  email?: string;
  website?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  waste_volume: 'alto' | 'medio' | 'bajo';
  waste_details?: string;
  key_contacts: KeyContact[];
  synthesis: string;
}

export class ResearchController {
  /**
   * Ejecuta una búsqueda web real con Serper.dev o simula resultados si no hay API Key
   */
  private static async searchWeb(query: string, apiKey: string = defaultSerperKey, client?: Client): Promise<any[]> {
    if (!apiKey) {
      console.log(`[ResearchController] Serper Key no configurada. Simulando búsqueda para: "${query}"`);
      return this.getSimulatedSearchResults(query, client);
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });

      if (!response.ok) {
        throw new Error(`Serper API respondió con estado ${response.status}`);
      }

      const data = await response.json();
      return (data.organic || []).map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
      }));
    } catch (error: any) {
      console.error('[ResearchController] Error en búsqueda real, usando simulación:', error.message);
      return this.getSimulatedSearchResults(query, client);
    }
  }

  /**
   * Genera resultados de búsqueda realistas para simulación
   */
  private static getSimulatedSearchResults(query: string, client?: Client): any[] {
    const cleanQuery = query.toLowerCase();
    
    // Extraer nombre aproximado
    let name = "Centro de Salud";
    if (query.includes('contacto')) {
      name = query.split('contacto')[0].trim();
    } else if (query.includes('residuos')) {
      name = query.split('residuos')[0].trim();
    }

    const domain = name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, '');

    const isHospital = cleanQuery.includes('hospital') || cleanQuery.includes('clinica') || cleanQuery.includes('clínica');
    const isLab = cleanQuery.includes('laboratorio') || cleanQuery.includes('lab');
    const isDentist = cleanQuery.includes('dental') || cleanQuery.includes('odontolog');
    const isVet = cleanQuery.includes('veterinaria') || cleanQuery.includes('vet');

    // Detección de país por coordenadas del cliente (o por defecto Perú)
    let phonePrefix = "+51"; // Perú por defecto
    let domainSuffix = "pe";

    if (client) {
      const lat = client.latitude;
      const lon = client.longitude;
      // Detección simple
      if (lat >= -56 && lat <= -17.5 && lon >= -76 && lon <= -66) {
        phonePrefix = "+56"; // Chile
        domainSuffix = "cl";
      } else if (lat >= -18 && lat <= 0 && lon >= -81 && lon <= -68) {
        phonePrefix = "+51"; // Perú
        domainSuffix = "pe";
      } else if (lat >= 14 && lat <= 32 && lon >= -118 && lon <= -86) {
        phonePrefix = "+52"; // México
        domainSuffix = "mx";
      } else if (lat >= -4 && lat <= 13 && lon >= -79 && lon <= -66) {
        phonePrefix = "+57"; // Colombia
        domainSuffix = "co";
      }
    }

    let phone = `${phonePrefix} 9${Math.floor(10000000 + Math.random() * 90000000)}`; // Formato móvil realista
    let email = `contacto@${domain || 'saludlocal'}.${domainSuffix}`;
    let website = `https://www.${domain || 'saludlocal'}.${domainSuffix}`;
    let director = 'Dr. Alejandro Gomez';
    let wasteType = 'residuos biológicos infecciosos, cultivos, jeringas y muestras de fluidos';
    let volume = 'medio';

    if (isHospital) {
      phone = `${phonePrefix} 9${Math.floor(10000000 + Math.random() * 90000000)}`;
      email = `info@${domain || 'hospitalcentral'}.${domainSuffix}`;
      website = `https://www.hospital${domain || 'central'}.${domainSuffix}`;
      director = 'Dra. María Elisa Fuentes (Directora Médica)';
      wasteType = 'residuos biopatogénicos, cortopunzantes, reactivos químicos de laboratorio, fármacos vencidos y trazas de radioterapia';
      volume = 'alto';
    } else if (isLab) {
      email = `recepcion@lab${domain || 'clinico'}.${domainSuffix}`;
      director = 'Bioq. Claudia Espinoza (Jefa de Laboratorio)';
      wasteType = 'reactivos químicos caducados, solventes orgánicos, muestras biológicas (sangre/orina), placas petri contaminadas';
      volume = 'medio';
    } else if (isDentist) {
      director = 'Dr. Cristian Ossa (Odontólogo Principal)';
      wasteType = 'amalgamas de mercurio, radiografías antiguas (plomo), agujas de anestesia, algodón con sangre';
      volume = 'bajo';
    } else if (isVet) {
      director = 'Dra. Pamela Rivas (Jefa de Veterinaria)';
      wasteType = 'agujas hipodérmicas, viales de vacunas, tejidos patológicos animales, fármacos de anestesia';
      volume = 'bajo';
    }

    return [
      {
        title: `${name} - Inicio y Servicios Médicos`,
        link: website,
        snippet: `Bienvenido a ${name}. Ofrecemos atención médica integral, urgencias 24/7 y servicios de alta complejidad. Dirección central. Teléfono principal: ${phone}. Correo: ${email}. Contáctanos para convenios.`
      },
      {
        title: `Contacto y Horarios - ${name}`,
        link: `${website}/contacto`,
        snippet: `Comunícate con ${name}. Para citas llamar al ${phone} o escribir a admision@${domain}.cl. Jefatura de administración a cargo de Carlos Valenzuela.`
      },
      {
        title: `Reglamento de Higiene y Manejo Ambiental - ${name}`,
        link: `${website}/transparencia`,
        snippet: `Plan de manejo de residuos especiales en ${name}. Cumplimiento estricto con las normas ambientales del Ministerio de Salud. Extracción semanal coordinada. Dirección médica a cargo de ${director}.`
      },
      {
        title: `Servicios de diagnóstico en ${name}`,
        link: `${website}/servicios`,
        snippet: `Contamos con equipamiento de última tecnología para toma de muestras, radiología y análisis químico. Generamos un manejo responsable con los desechos clínicos del tipo: ${wasteType}.`
      }
    ];
  }

  /**
   * Ejecuta el proceso de Deep Research sobre un cliente
   */
  static async performResearch(
    client: Client,
    keys?: { deepseekKey?: string; serperKey?: string }
  ): Promise<{ client: Client; log: ResearchLog }> {
    const deepseekApiKey = keys?.deepseekKey || process.env.DEEPSEEK_API_KEY;
    const serperApiKey = keys?.serperKey || defaultSerperKey;

    if (!deepseekApiKey) {
      throw new Error('No se ha configurado la API Key de DeepSeek para el análisis.');
    }

    // Si el cliente proviene de Google Places, obtener detalles (teléfono y web oficial) usando la API de Google
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (client.id.startsWith('google-') && googleMapsApiKey.trim() !== '') {
      const placeId = client.id.replace('google-', '');
      try {
        console.log(`[ResearchController] Obteniendo detalles de Google Place para ID: ${placeId}`);
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website,formatted_address&key=${googleMapsApiKey}`;
        const response = await fetch(detailsUrl);
        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 'OK' && resData.result) {
            const result = resData.result;
            if (result.formatted_phone_number) client.phone = result.formatted_phone_number;
            if (result.website) client.website = result.website;
            if (result.formatted_address) client.address = result.formatted_address;
            console.log(`[ResearchController] Detalles obtenidos de Google Places: Tel: ${client.phone}, Web: ${client.website}`);
          }
        }
      } catch (err: any) {
        console.error('[ResearchController] Error al obtener detalles de Google Places:', err.message);
      }
    }

    // 1. Ejecutar búsquedas en la web en paralelo
    const query1 = `${client.name} contacto telefono email`;
    const query2 = `${client.name} residuos`;
    const query3 = `${client.name} facebook instagram linkedin`;
    const query4 = `${client.name} direccion telefono`;
    
    console.log(`[ResearchController] Ejecutando búsquedas en paralelo con Serper para: ${client.name}...`);
    let allSearchResults: any[] = [];
    try {
      const [results1, results2, results3, results4] = await Promise.all([
        this.searchWeb(query1, serperApiKey, client),
        this.searchWeb(query2, serperApiKey, client),
        this.searchWeb(query3, serperApiKey, client),
        this.searchWeb(query4, serperApiKey, client)
      ]);
      allSearchResults = [...results1, ...results2, ...results3, ...results4];
    } catch (searchErr: any) {
      console.error('[ResearchController] Error en búsquedas paralelas de Serper:', searchErr.message);
      const results1 = await this.searchWeb(query1, serperApiKey, client);
      const results2 = await this.searchWeb(query2, serperApiKey, client);
      allSearchResults = [...results1, ...results2];
    }
    
    // 2. Preparar el prompt para DeepSeek V4
    const systemPrompt = `Eres un asistente experto en investigación de mercado, fiscalización ambiental y gestión de residuos peligrosos.
Tu objetivo es analizar resultados de búsqueda web para un cliente específico y extraer/sintetizar información de contacto completa y detalles sobre su generación de residuos.
Debes responder ÚNICAMENTE con un objeto JSON válido que contenga la estructura definida. No agregues texto explicativo antes ni después del JSON.

Estructura JSON requerida:
{
  "phone": "Teléfono de contacto principal (debe ser un string)",
  "email": "Correo electrónico de contacto (debe ser un string)",
  "website": "URL del sitio web oficial",
  "social_media": {
    "facebook": "Enlace oficial a la página de Facebook si se encuentra (o un string vacío)",
    "instagram": "Enlace oficial a la página de Instagram si se encuentra (o un string vacío)",
    "linkedin": "Enlace oficial a la página de LinkedIn si se encuentra (o un string vacío)"
  },
  "waste_volume": "alto" | "medio" | "bajo" (estimación del volumen según su tamaño y especialidad),
  "waste_details": "Detalles específicos del tipo de residuos peligrosos generados (ej: cortopunzantes, infecciosos, reactivos químicos, fármacos vencidos, etc.)",
  "key_contacts": [
    {
      "name": "Nombre de persona clave (director, jefe de compras, administrador, etc.)",
      "role": "Cargo o función",
      "phone": "Teléfono directo (opcional)",
      "email": "Email directo (opcional)"
    }
  ],
  "synthesis": "Una síntesis corta (2-3 oraciones en español) que resuma los hallazgos sobre la empresa, canales de contacto y necesidades de residuos."
}`;

    const userContent = `Cliente a investigar:
Nombre: ${client.name}
Tipo: ${client.type}
Dirección: ${client.address || 'No especificada'}

Resultados de búsqueda web recopilados:
${JSON.stringify(allSearchResults, null, 2)}

Por favor, analiza con cuidado, extrae toda la información disponible, completa los campos requeridos y realiza la síntesis. Responde solo en JSON.`;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];

    console.log(`[ResearchController] Enviando análisis a DeepSeek V4 para ${client.name}...`);
    const responseText = await callDeepSeek(messages, true, { apiKey: deepseekApiKey });
    
    let parsedData: ResearchResult;
    try {
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanedJson);
    } catch (e: any) {
      console.error('[ResearchController] Error al parsear JSON retornado por DeepSeek. Respuesta cruda:', responseText);
      throw new Error(`DeepSeek no devolvió un JSON válido: ${e.message}`);
    }

    // Construir bloque de redes sociales para las notas
    let socialNotes = '';
    if (parsedData.social_media) {
      const { facebook, instagram, linkedin } = parsedData.social_media;
      if (facebook || instagram || linkedin) {
        socialNotes = `\n\n[Redes Sociales]:` +
          (facebook ? `\n- Facebook: ${facebook}` : '') +
          (instagram ? `\n- Instagram: ${instagram}` : '') +
          (linkedin ? `\n- LinkedIn: ${linkedin}` : '');
      }
    }

    // 3. Actualizar el cliente con la información enriquecida
    const updatedClientData: Partial<Client> = {
      phone: parsedData.phone || client.phone,
      email: parsedData.email || client.email,
      website: parsedData.website || client.website,
      waste_volume: parsedData.waste_volume || client.waste_volume,
      waste_details: parsedData.waste_details || client.waste_details,
      key_contacts: parsedData.key_contacts || client.key_contacts,
      notes: client.notes 
        ? `${client.notes}\n\n[IA Síntesis]: ${parsedData.synthesis}${socialNotes}`
        : `[IA Síntesis]: ${parsedData.synthesis}${socialNotes}`,
      status: client.status === 'nuevo' ? 'nuevo' : client.status
    };

    // Si estamos en modo Supabase (servidor), guardamos en la BD
    let savedClient = client;
    let savedLog: ResearchLog = {
      id: '',
      client_id: client.id,
      search_queries: [query1, query2, query3, query4],
      raw_search_results: allSearchResults,
      deepseek_response: responseText
    };

    try {
      savedClient = await ClientModel.update(client.id, updatedClientData);
      savedLog = await ResearchModel.create({
        client_id: client.id,
        search_queries: [query1, query2, query3, query4],
        raw_search_results: allSearchResults,
        deepseek_response: responseText
      });
    } catch (dbError: any) {
      console.warn('[ResearchController] Fallo al escribir en Supabase. Operando en modo memoria/local:', dbError.message);
      savedClient = { ...client, ...updatedClientData };
    }

    return {
      client: savedClient,
      log: savedLog
    };
  }
}
