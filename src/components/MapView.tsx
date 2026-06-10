'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../styles/modules/MapView.module.css';
import { Client } from '@/models/db';

interface MapViewProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  origin: { latitude: number; longitude: number };
  onOriginChange: (lat: number, lon: number) => void;
  searchRadius: number; // en metros
}

export default function MapView({
  clients,
  onSelectClient,
  origin,
  onOriginChange,
  searchRadius,
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
    const map = L.map(mapRef.current).setView([origin.latitude, origin.longitude], 13);
    mapInstance.current = map;

    // Agregar capa de OpenStreetMap (se aplicará el filtro de globals.css para tema oscuro)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
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
          <div style="
            width: 20px;
            height: 20px;
            background: #f59e0b;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(245,158,11,0.8);
            position: relative;
          ">
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: rgba(245,158,11,0.4);
              animation: map-pulse 1.5s infinite;
              top: -3px;
              left: -3px;
              border: 3px solid transparent;
            "></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      originMarker.current = L.marker([origin.latitude, origin.longitude], {
        icon: originIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup('<b>Centro de Búsqueda</b><br/>Haz doble click en cualquier punto del mapa para reubicar.');
    }

    // Actualizar o crear círculo de radio
    if (radiusCircle.current) {
      radiusCircle.current.setLatLng([origin.latitude, origin.longitude]);
      radiusCircle.current.setRadius(searchRadius);
    } else {
      radiusCircle.current = L.circle([origin.latitude, origin.longitude], {
        radius: searchRadius,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.04,
        weight: 1.5,
        dashArray: '5, 5',
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

    // Paleta de colores para tipos de establecimientos
    const colors: Record<string, string> = {
      hospital: '#ef4444',    // Rojo
      clinic: '#3b82f6',      // Azul
      laboratory: '#10b981',  // Verde
      dentist: '#f59e0b',     // Naranja
      veterinary: '#a855f7',  // Morado
    };

    const icons: Record<string, string> = {
      hospital: '🏥',
      clinic: '⚕️',
      laboratory: '🧪',
      dentist: '🦷',
      veterinary: '🐾',
    };

    clients.forEach((client) => {
      const color = colors[client.type] || '#64748b';
      const iconText = icons[client.type] || '📍';

      // Ícono personalizado HTML
      const markerIcon = L.divIcon({
        className: `client-marker-${client.id}`,
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background-color: ${color};
            color: #ffffff;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            transition: transform 0.2s ease;
          "
          onmouseover="this.style.transform='scale(1.15)';"
          onmouseout="this.style.transform='scale(1)';"
          >
            ${iconText}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Crear marcador y enlazar popup
      const marker = L.marker([client.latitude, client.longitude], { icon: markerIcon });
      
      // Contenido del popup
      const popupContainer = document.createElement('div');
      popupContainer.style.display = 'flex';
      popupContainer.style.flexDirection = 'column';
      popupContainer.style.gap = '6px';
      
      const typeLabel = client.type === 'hospital' ? 'Hospital' :
                        client.type === 'clinic' ? 'Clínica' :
                        client.type === 'laboratory' ? 'Laboratorio' :
                        client.type === 'dentist' ? 'Dentista' : 'Veterinaria';

      popupContainer.innerHTML = `
        <div style="font-weight:700; font-size:0.95rem; color:#ffffff; margin-bottom:2px;">${client.name}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted); display:flex; gap:6px; align-items:center;">
          <span style="background:${color}33; color:${color}; padding:1px 6px; border-radius:4px; font-weight:600; text-transform:uppercase; font-size:0.65rem;">
            ${typeLabel}
          </span>
          <span>${client.address || ''}</span>
        </div>
        <div style="margin-top:6px; display:flex; gap:8px;">
          <button id="popup-btn-${client.id}" style="
            background: #10b981;
            color: #000000;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s;
          ">🔍 Investigar Cliente</button>
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
  }, [clients]);

  return (
    <div className={styles.mapWrapper}>
      {/* Guía flotante del mapa */}
      <div className={styles.infoOverlay}>
        <div className={styles.pulseDot}></div>
        <span>Haz doble click en el mapa para mover el centro de búsqueda</span>
      </div>

      <div ref={mapRef} className={styles.mapContainer} />

      {/* Leyenda flotante */}
      <div className={styles.legendCard}>
        <div className={styles.legendTitle}>Categorías</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ background: '#ef4444' }}></div>
            <span>Hospitales / Clínicas Clínicas</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ background: '#3b82f6' }}></div>
            <span>Centros Médicos / Policlínicos</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ background: '#10b981' }}></div>
            <span>Laboratorios Clínicos</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ background: '#f59e0b' }}></div>
            <span>Consultas Dentales</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.colorDot} style={{ background: '#a855f7' }}></div>
            <span>Veterinarias</span>
          </div>
        </div>
      </div>
    </div>
  );
}
