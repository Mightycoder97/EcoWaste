'use client';

import React, { useState, useMemo } from 'react';
import styles from '../styles/modules/LeadTable.module.css';
import { Client } from '@/models/db';

interface LeadTableProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onInvestigateClient: (client: Client) => void;
  onSaveToCRM: (client: Client) => void;
  savedIds: Set<string>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onBulkInvestigate?: () => void;
}

export default function LeadTable({
  clients,
  onSelectClient,
  onInvestigateClient,
  onSaveToCRM,
  savedIds,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkInvestigate,
}: LeadTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 1. Filtrar lista de clientes
  const filteredClients = useMemo(() => {
    const filtered = clients.filter((client) => {
      const matchSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = typeFilter === '' || client.type === typeFilter;
      const matchStatus = statusFilter === '' || client.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });

    // Deduplicar estrictamente por ID para evitar warnings de llaves repetidas en React
    const unique: Client[] = [];
    const seen = new Set<string>();
    filtered.forEach((c) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    });
    return unique;
  }, [clients, searchTerm, typeFilter, statusFilter]);

  // 2. Exportar a CSV
  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;

    // Encabezados
    const headers = [
      'Nombre',
      'Tipo',
      'Direccion',
      'Telefono',
      'Correo',
      'Sitio Web',
      'Estado CRM',
      'Volumen Residuos',
      'Detalle Residuos',
      'Notas'
    ];

    // Mapear filas
    const rows = filteredClients.map((c) => {
      const typeLabel = c.type === 'hospital' ? 'Hospital' :
                        c.type === 'clinic' ? 'Clínica' :
                        c.type === 'laboratory' ? 'Laboratorio' :
                        c.type === 'dentist' ? 'Dentista' : 'Veterinaria';

      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${typeLabel}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        `"${c.email || ''}"`,
        `"${c.website || ''}"`,
        `"${c.status.toUpperCase()}"`,
        `"${c.waste_volume || ''}"`,
        `"${(c.waste_details || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_residuos_peligrosos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className={styles.tableContainer}>
      {/* Filtros */}
      <div className={styles.filtersBar}>
        <div className={styles.searchGroup}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.selectWrapper}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="hospital">Hospitales</option>
            <option value="clinic">Clínicas</option>
            <option value="laboratory">Laboratorios</option>
            <option value="dentist">Dentistas</option>
            <option value="veterinary">Veterinarias</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="nuevo">Nuevo (Buscador)</option>
            <option value="contactado">Contactado</option>
            <option value="negociacion">En Negociación</option>
            <option value="ganado">Cerrado (Ganado)</option>
            <option value="descartado">Descartado</option>
          </select>
        </div>

        <button 
          onClick={handleExportCSV} 
          className={styles.btnExport}
          disabled={filteredClients.length === 0}
        >
          📤 Descargar Excel (CSV)
        </button>
      </div>

      {/* Tabla (Escritorio) */}
      <div className={styles.tableWrapper}>
        {filteredClients.length === 0 ? (
          <div className={styles.noResults}>
            No se encontraron clientes calificados en esta vista.
          </div>
        ) : (
          <table className={styles.leadTable}>
            <thead>
              <tr>
                {selectedIds && onToggleSelectAll && (
                  <th style={{ width: '40px', padding: '14px 10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredClients.length > 0 && filteredClients.every((c) => selectedIds.has(c.id))}
                      onChange={onToggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th>Establecimiento</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th>Contacto Encontrado</th>
                <th>Volumen Residuos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const isSaved = savedIds.has(client.id);
                
                return (
                  <tr key={client.id} className={selectedIds?.has(client.id) ? styles.rowSelected : ''}>
                    {selectedIds && onToggleSelect && (
                      <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(client.id)}
                          onChange={() => onToggleSelect(client.id)}
                          style={{ cursor: 'pointer', accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                        />
                      </td>
                    )}
                    <td>
                      <div className={styles.clientNameCell}>{client.name}</div>
                      <span className={`status-badge status-${client.status}`}>
                        {client.status}
                      </span>
                    </td>
                    <td>
                      <span className={`type-badge type-${client.type}`}>
                        {getTypeLabel(client.type)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.addressCell} title={client.address}>
                        {client.address || 'Sin dirección registrada'}
                      </div>
                    </td>
                    <td>
                      <div className={styles.contactInfoCell}>
                        {client.phone && <span>📞 {client.phone}</span>}
                        {client.email && (
                          <a href={`mailto:${client.email}`} className={styles.contactLink}>
                            ✉️ {client.email}
                          </a>
                        )}
                        {!client.phone && !client.email && (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            No investigado aún
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {client.waste_volume ? (
                        <span className={`${styles.wasteVolumeCell} ${
                          client.waste_volume === 'alto' ? styles.volumeHigh :
                          client.waste_volume === 'medio' ? styles.volumeMedium : styles.volumeLow
                        }`}>
                          🔴 {client.waste_volume.toUpperCase()}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          Sin clasificar
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          onClick={() => onSelectClient(client)}
                          className={`${styles.btnAction} ${styles.btnActionSecondary}`}
                        >
                          👁️ Ficha
                        </button>
                        
                        {!isSaved && (
                          <button
                            onClick={() => onSaveToCRM(client)}
                            className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                          >
                            ➕ CRM
                          </button>
                        )}
                        
                        <button
                          onClick={() => onInvestigateClient(client)}
                          className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                          style={{
                            background: 'var(--border-glow)',
                            color: 'var(--color-primary-hover)',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          🤖 DeepSeek
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Tarjetas responsivas (Móvil) */}
      <div className={styles.mobileCardList}>
        {filteredClients.length === 0 ? (
          <div className={styles.noResults}>
            No se encontraron clientes calificados en esta vista.
          </div>
        ) : (
          filteredClients.map((client) => {
            const isSaved = savedIds.has(client.id);
            const isChecked = selectedIds?.has(client.id);
            
            return (
              <div key={client.id} className={`${styles.mobileCard} ${isChecked ? styles.cardSelected : ''}`}>
                {selectedIds && onToggleSelect && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Seleccionar para análisis</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect(client.id)}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                    />
                  </div>
                )}
                <div className={styles.mobileCardHeader}>
                  <div className={styles.mobileCardTitle}>{client.name}</div>
                  <div className={styles.mobileCardBadges}>
                    <span className={`type-badge type-${client.type}`}>
                      {getTypeLabel(client.type)}
                    </span>
                    <span className={`status-badge status-${client.status}`}>
                      {client.status}
                    </span>
                  </div>
                </div>

                <div className={styles.mobileCardBody}>
                  <div className={styles.mobileCardInfo}>
                    <span className={styles.mobileCardLabel}>📍 Dirección:</span>
                    <span className={styles.mobileCardValue}>{client.address || 'Sin dirección registrada'}</span>
                  </div>

                  <div className={styles.mobileCardInfo}>
                    <span className={styles.mobileCardLabel}>📞 Contacto:</span>
                    <div className={styles.mobileCardContact}>
                      {client.phone && <span>📞 {client.phone}</span>}
                      {client.email && (
                        <a href={`mailto:${client.email}`} className={styles.contactLink}>
                          ✉️ {client.email}
                        </a>
                      )}
                      {!client.phone && !client.email && (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                          No investigado aún
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.mobileCardInfo}>
                    <span className={styles.mobileCardLabel}>☣️ Residuos:</span>
                    {client.waste_volume ? (
                      <span className={`${styles.wasteVolumeCell} ${
                        client.waste_volume === 'alto' ? styles.volumeHigh :
                        client.waste_volume === 'medio' ? styles.volumeMedium : styles.volumeLow
                      }`}>
                        🔴 {client.waste_volume.toUpperCase()}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        Sin clasificar
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.mobileCardActions}>
                  <button
                    onClick={() => onSelectClient(client)}
                    className={`${styles.btnAction} ${styles.btnActionSecondary}`}
                  >
                    👁️ Ficha
                  </button>
                  
                  {!isSaved && (
                    <button
                      onClick={() => onSaveToCRM(client)}
                      className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                    >
                      ➕ CRM
                    </button>
                  )}
                  
                  <button
                    onClick={() => onInvestigateClient(client)}
                    className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                    style={{
                      background: 'var(--border-glow)',
                      color: 'var(--color-primary-hover)',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    🤖 DeepSeek
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Barra flotante de acciones en lote */}
      {selectedIds && selectedIds.size > 0 && onBulkInvestigate && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkActionInfo}>
            <span className={styles.bulkActionIcon}>⚡</span>
            <div>
              <div className={styles.bulkActionTitle}>
                <b>{selectedIds.size}</b> {selectedIds.size === 1 ? 'establecimiento seleccionado' : 'establecimientos seleccionados'}
              </div>
              <div className={styles.bulkActionSubtitle}>Listo para investigación con DeepSeek V4</div>
            </div>
          </div>
          <button onClick={onBulkInvestigate} className={styles.btnBulkAction}>
            🤖 Investigar Selección
          </button>
        </div>
      )}
    </div>
  );
}
