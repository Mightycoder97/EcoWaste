'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Client } from '@/models/db';

interface MapViewProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  origin: { latitude: number; longitude: number };
  onOriginChange: (lat: number, lon: number) => void;
  searchRadius: number; // en metros
  savedIds?: Set<string>;
}

export default function MapView({
  clients,
  onSelectClient,
  origin,
  onOriginChange,
  searchRadius,
  savedIds,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.LayerGroup | null>(null);
  const radiusCircle = useRef<L.Circle | null>(null);
  const originMarker = useRef<L.Marker | null>(null);

  // 1. Inicializar el mapa
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Crear la instancia del mapa
    const map = L.map(mapRef.current, {
      doubleClickZoom: false // desactivar para manejar doble click personalizado
    }).setView([origin.latitude, origin.longitude], 13);
    mapInstance.current = map;

    // Agregar capa de OpenStreetMap (se aplicará el filtro de globals.css para tema oscuro)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    // Crear grupo para los marcadores de clientes
    const group = L.layerGroup().addTo(map);
    markersGroup.current = group;

    // Agregar evento para cambiar origen con doble click
    map.on('dblclick', (e: L.LeafletMouseEvent) => {
      onOriginChange(e.latlng.lat, e.latlng.lng);
    });

    // Limpieza al desmontar
    return () => {
      if (mapInstance.current) {
        mapInstance.current.off();
        mapInstance.current.remove();
        mapInstance.current = null;
        markersGroup.current = null;
        radiusCircle.current = null;
        originMarker.current = null;
      }
    };
  }, []); // Solo al montar

  // 2. Actualizar el centro y el radio de búsqueda
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Mover o crear marcador de origen
    if (originMarker.current) {
      originMarker.current.setLatLng([origin.latitude, origin.longitude]);
    } else {
      const originIcon = L.divIcon({
        className: 'origin-marker-container',
        html: `
          <div class="origin-marker-pulse" style="
            width: 14px;
            height: 14px;
            background: #fafafa;
            border: 2px solid #09090b;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(255,255,255,0.6);
            position: relative;
          ">
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      originMarker.current = L.marker([origin.latitude, origin.longitude], {
        icon: originIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup('<div style="font-family:sans-serif;font-size:11px;color:#ffffff;font-weight:600;">Centro de Búsqueda</div><div style="font-family:sans-serif;font-size:10px;color:#a1a1aa;margin-top:2px;">Haz doble click en el mapa para mover el buscador.</div>');
    }

    // Actualizar o crear círculo de radio
    if (radiusCircle.current) {
      radiusCircle.current.setLatLng([origin.latitude, origin.longitude]);
      radiusCircle.current.setRadius(searchRadius);
    } else {
      radiusCircle.current = L.circle([origin.latitude, origin.longitude], {
        radius: searchRadius,
        color: '#27272a',
        fillColor: '#ffffff',
        fillOpacity: 0.02,
        weight: 1,
        dashArray: '4, 4',
      }).addTo(map);
    }

    // Centrar la vista en el origen de forma suave
    map.panTo([origin.latitude, origin.longitude]);
  }, [origin.latitude, origin.longitude, searchRadius]);

  // 3. Pintar los marcadores de clientes
  useEffect(() => {
    const map = mapInstance.current;
    const group = markersGroup.current;
    if (!map || !group) return;

    // Limpiar marcadores anteriores
    group.clearLayers();

    // Identificación minimalista por letra
    const labels: Record<string, string> = {
      hospital: 'H',
      clinic: 'C',
      laboratory: 'L',
      dentist: 'D',
      veterinary: 'V',
    };

    clients.forEach((client) => {
      const char = labels[client.type] || 'M';
      const isSaved = savedIds?.has(client.id);
      const isInvestigated = client.waste_volume !== undefined || (client.notes && client.notes.includes('[IA Síntesis]:'));

      // Estilo minimalista de escala de grises
      let markerBgColor = '#18181b'; // zinc-900
      let markerBorderColor = '#3f3f46'; // zinc-700
      let markerTextColor = '#a1a1aa'; // zinc-400
      let markerBoxShadow = '0 2px 4px rgba(0,0,0,0.5)';
      let badgeHtml = '';

      if (isInvestigated) {
        markerBgColor = '#fafafa'; // zinc-50 (destacado por enriquecido)
        markerBorderColor = '#ffffff';
        markerTextColor = '#18181b'; // zinc-900
        markerBoxShadow = '0 0 10px rgba(255, 255, 255, 0.4)';
        badgeHtml = `
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ffffff;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid #18181b;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            z-index: 10;
          "></div>
        `;
      } else if (isSaved) {
        markerBgColor = '#27272a'; // zinc-800
        markerBorderColor = '#fafafa'; // borde blanco para indicar que está en el CRM
        markerTextColor = '#fafafa';
      }

      // Alertas puntuales (por volumen de residuos alto)
      if (client.waste_volume === 'alto') {
        // Alerta visual sutil: un pequeño punto rojo de alerta sobre el marcador
        badgeHtml = `
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ef4444;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid #18181b;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            z-index: 10;
          "></div>
        `;
      }

      // Ícono personalizado HTML
      const markerIcon = L.divIcon({
        className: `client-marker-${client.id}`,
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              width: 24px;
              height: 24px;
              background-color: ${markerBgColor};
              color: ${markerTextColor};
              border-radius: 6px;
              border: 1px solid ${markerBorderColor};
              box-shadow: ${markerBoxShadow};
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 700;
              font-family: sans-serif;
              cursor: pointer;
              transition: transform 0.15s ease;
            "
            onmouseover="this.style.transform='scale(1.1)';"
            onmouseout="this.style.transform='scale(1)';"
            >
              ${char}
            </div>
            ${badgeHtml}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      // Crear marcador y enlazar popup
      const marker = L.marker([client.latitude, client.longitude], { icon: markerIcon });
      
      // Contenido del popup
      const popupContainer = document.createElement('div');
      popupContainer.style.display = 'flex';
      popupContainer.style.flexDirection = 'column';
      popupContainer.style.gap = '5px';
      
      const typeLabel = client.type === 'hospital' ? 'Hospital' :
                        client.type === 'clinic' ? 'Clínica' :
                        client.type === 'laboratory' ? 'Laboratorio' :
                        client.type === 'dentist' ? 'Dentista' : 'Veterinaria';

      let stateBadge = '';
      if (isInvestigated) {
        stateBadge = `<span style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:1px 6px; border-radius:4px; font-weight:600; font-size:0.6rem; text-transform:uppercase;">Calificado</span>`;
      } else if (isSaved) {
        stateBadge = `<span style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#a1a1aa; padding:1px 6px; border-radius:4px; font-weight:600; font-size:0.6rem; text-transform:uppercase;">En CRM</span>`;
      } else {
        stateBadge = `<span style="background:transparent; border:1px solid #27272a; color:#71717a; padding:1px 6px; border-radius:4px; font-weight:600; font-size:0.6rem; text-transform:uppercase;">Buscador</span>`;
      }

      popupContainer.innerHTML = `
        <div style="font-weight:700; font-size:0.85rem; color:#ffffff; margin-bottom:1px; line-height:1.2;">${client.name}</div>
        <div style="font-size:0.7rem; color:#a1a1aa; display:flex; flex-direction:column; gap:4px; margin-bottom:3px;">
          <div style="display:flex; gap:5px; align-items:center; margin-top:2px;">
            <span style="background:#27272a; color:#fafafa; border:1px solid #3f3f46; padding:1px 5px; border-radius:3px; font-weight:600; text-transform:uppercase; font-size:0.58rem;">
              ${typeLabel}
            </span>
            ${stateBadge}
          </div>
          <span style="margin-top:2px; line-height:1.3;">${client.address || 'Sin dirección'}</span>
        </div>
        ${client.waste_volume ? `
          <div style="font-size:0.7rem; color:#ffffff; background:rgba(255, 255, 255, 0.03); border:1px solid #27272a; border-radius:4px; padding:5px 8px; margin-bottom:4px; margin-top:2px;">
            <b>Residuos:</b> <span style="font-mono;font-weight:600;${client.waste_volume === 'alto' ? 'color:#ef4444;' : client.waste_volume === 'medio' ? 'color:#eab308;' : 'color:#fafafa;'}">${client.waste_volume.toUpperCase()}</span>
            ${client.waste_details ? `<br/><span style="font-size:0.65rem; color:#a1a1aa; display:block; margin-top:2px;">${client.waste_details}</span>` : ''}
          </div>
        ` : ''}
        <div style="margin-top:4px; display:flex;">
          <button id="popup-btn-${client.id}" style="
            background: #ffffff;
            color: #09090b;
            border: none;
            border-radius: 4px;
            padding: 5px 8px;
            font-size: 0.7rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.15s;
          " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Ver detalles</button>
        </div>
      `;

      // Manejar click del botón en el popup
      marker.bindPopup(popupContainer);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${client.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectClient(client);
            marker.closePopup();
          };
        }
      });

      group.addLayer(marker);
    });
  }, [clients, savedIds]);

  return (
    <div className="relative w-full h-full min-h-[300px] flex flex-col flex-1">
      {/* Guía flotante del mapa */}
      <div className="absolute top-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border px-3 py-1.5 rounded-md shadow text-[10px] text-muted-foreground flex items-center gap-2 pointer-events-none select-none">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse"></div>
        <span>Doble click para reubicar origen de búsqueda</span>
      </div>

      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden border border-border flex-1" />

      {/* Leyenda flotante */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border p-3.5 rounded-lg shadow-lg flex flex-col gap-2 min-w-[180px] pointer-events-auto select-none">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Tipos de Centro
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded bg-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center">H</div>
            <span>Hospitales / Clínicas</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded bg-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center">C</div>
            <span>Centros Médicos</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded bg-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center">L</div>
            <span>Laboratorios Clínicos</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded bg-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center">D</div>
            <span>Consultas Dentales</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="w-4 h-4 rounded bg-muted border border-border text-[9px] font-bold text-foreground flex items-center justify-center">V</div>
            <span>Veterinarias</span>
          </div>
        </div>
      </div>
    </div>
  );
}
