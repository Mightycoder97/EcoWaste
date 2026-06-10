'use client';

import React, { useState } from 'react';
import styles from '../styles/modules/CRMBoard.module.css';
import { Client } from '@/models/db';

interface CRMBoardProps {
  clients: Client[];
  onUpdateClientStatus: (id: string, newStatus: Client['status']) => void;
  onSelectClient: (client: Client) => void;
}

type ColumnType = Client['status'];

export default function CRMBoard({
  clients,
  onUpdateClientStatus,
  onSelectClient,
}: CRMBoardProps) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnType | null>(null);

  // 1. Columnas y sus etiquetas en el CRM
  const columns: { type: ColumnType; title: string; color: string }[] = [
    { type: 'nuevo', title: 'Nuevo Prospecto', color: 'var(--color-text-muted)' },
    { type: 'contactado', title: 'Contactado', color: 'var(--color-info)' },
    { type: 'negociacion', title: 'En Negociación', color: 'var(--color-warning)' },
    { type: 'ganado', title: 'Contrato Ganado', color: 'var(--color-primary)' },
    { type: 'descartado', title: 'Descartado', color: 'var(--color-danger)' },
  ];

  // 2. Agrupar clientes por su estado
  const clientsByColumn = React.useMemo(() => {
    const groups: Record<ColumnType, Client[]> = {
      nuevo: [],
      contactado: [],
      negociacion: [],
      ganado: [],
      descartado: [],
    };
    clients.forEach((c) => {
      if (groups[c.status]) {
        groups[c.status].push(c);
      }
    });
    return groups;
  }, [clients]);

  // 3. Manejadores de Drag & Drop nativo
  const handleDragStart = (id: string) => {
    setDraggedCardId(id);
  };

  const handleDragOver = (e: React.DragEvent, column: ColumnType) => {
    e.preventDefault();
    if (dragOverColumn !== column) {
      setDragOverColumn(column);
    }
  };

  const handleDrop = (column: ColumnType) => {
    if (draggedCardId) {
      onUpdateClientStatus(draggedCardId, column);
    }
    setDraggedCardId(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverColumn(null);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hospital': return 'Hospital';
      case 'clinic': return 'Clínica';
      case 'laboratory': return 'Laboratorio';
      case 'dentist': return 'Dentista';
      case 'veterinary': return 'Veterinaria';
      default: return type;
    }
  };

  // Botón para mover rápidamente al siguiente estado (para móviles)
  const getNextStatus = (current: ColumnType): ColumnType | null => {
    const order: ColumnType[] = ['nuevo', 'contactado', 'negociacion', 'ganado'];
    const idx = order.indexOf(current);
    if (idx !== -1 && idx < order.length - 1) {
      return order[idx + 1];
    }
    return null;
  };

  return (
    <div className={styles.boardContainer}>
      {columns.map((col) => {
        const colClients = clientsByColumn[col.type] || [];
        const isOver = dragOverColumn === col.type;

        return (
          <div
            key={col.type}
            className={`${styles.column} ${isOver ? styles.cardDragOver : ''}`}
            onDragOver={(e) => handleDragOver(e, col.type)}
            onDrop={() => handleDrop(col.type)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            {/* Header de columna */}
            <div className={styles.columnHeader}>
              <div className={styles.columnTitle} style={{ color: col.color }}>
                <span>●</span> {col.title}
              </div>
              <span className={styles.countBadge}>{colClients.length}</span>
            </div>

            {/* Listado de Tarjetas */}
            <div className={styles.cardsContainer}>
              {colClients.map((client) => {
                const nextStatus = getNextStatus(client.status);
                
                return (
                  <div
                    key={client.id}
                    className={styles.card}
                    draggable
                    onDragStart={() => handleDragStart(client.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className={styles.cardTitle}>{client.name}</div>
                    
                    <div className={styles.cardMeta}>
                      <span className={`type-badge type-${client.type}`} style={{ fontSize: '0.65rem' }}>
                        {getTypeLabel(client.type)}
                      </span>
                      {client.waste_volume && (
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '600',
                          color: client.waste_volume === 'alto' ? 'var(--color-danger)' : 
                                 client.waste_volume === 'medio' ? 'var(--color-warning)' : 'var(--color-primary)'
                        }}>
                          ☣️ {client.waste_volume.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className={styles.cardAddress} title={client.address}>
                      📍 {client.address || 'Sin dirección'}
                    </div>

                    {(client.phone || client.email) && (
                      <div className={styles.cardDetails}>
                        {client.phone && <span>📞 {client.phone}</span>}
                        {client.email && <span>✉️ {client.email}</span>}
                      </div>
                    )}

                    <div className={styles.quickActions}>
                      <button
                        onClick={() => onSelectClient(client)}
                        className={styles.btnQuick}
                      >
                        👁️ Ficha
                      </button>

                      {nextStatus && (
                        <button
                          onClick={() => onUpdateClientStatus(client.id, nextStatus)}
                          className={styles.btnQuick}
                          title={`Mover a ${nextStatus}`}
                        >
                          ➡️
                        </button>
                      )}
                      
                      {client.status !== 'descartado' && (
                        <button
                          onClick={() => onUpdateClientStatus(client.id, 'descartado')}
                          className={styles.btnQuick}
                          style={{ color: 'var(--color-danger)' }}
                          title="Descartar prospecto"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {colClients.length === 0 && (
                <div style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  border: '1px dashed #334155',
                  borderRadius: '8px'
                }}>
                  Arrastra prospectos aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
