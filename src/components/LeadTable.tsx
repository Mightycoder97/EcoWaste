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

  // 2. Exportar a Excel (.xls estructurado y con estilos CSS para orden y diseño)
  const handleExportExcel = () => {
    if (filteredClients.length === 0) return;

    const typeLabels: Record<string, string> = {
      hospital: 'Hospital',
      clinic: 'Clínica',
      laboratory: 'Laboratorio',
      dentist: 'Dentista',
      veterinary: 'Veterinaria',
    };

    const rowsHtml = filteredClients
      .map((c) => {
        const typeLabel = typeLabels[c.type] || c.type;
        const wasteVolume = c.waste_volume || 'sin clasificar';
        
        return `
          <tr>
            <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 8px;">${c.name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">
              <span class="type-badge type-${c.type}">${typeLabel}</span>
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; color: #475569;">${c.address || 'Sin dirección'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">${c.phone || 'No registrado'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">
              ${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : 'No registrado'}
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">
              ${c.website ? `<a href="${c.website}" target="_blank">${c.website}</a>` : 'No registrado'}
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
              <span class="status-badge status-${c.status}">${c.status.toUpperCase()}</span>
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
              <span class="volume-badge volume-${c.waste_volume || 'none'}">${wasteVolume.toUpperCase()}</span>
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; color: #475569;">${c.waste_details || ''}</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; color: #475569;">${c.notes || ''}</td>
          </tr>
        `;
      })
      .join('');

    const htmlTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8"/>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Leads Calificados</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
        th { background-color: #10b981; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 10px; text-align: left; }
        .type-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; }
        .type-hospital { color: #dc2626; background-color: #fee2e2; }
        .type-clinic { color: #2563eb; background-color: #dbeafe; }
        .type-laboratory { color: #059669; background-color: #d1fae5; }
        .type-dentist { color: #d97706; background-color: #fef3c7; }
        .type-veterinary { color: #7c3aed; background-color: #f3e8ff; }
        
        .status-badge { font-weight: bold; font-size: 9pt; padding: 2px 6px; border-radius: 4px; }
        .status-nuevo { color: #475569; background-color: #f1f5f9; }
        .status-contactado { color: #2563eb; background-color: #dbeafe; }
        .status-negociacion { color: #d97706; background-color: #fef3c7; }
        .status-ganado { color: #059669; background-color: #d1fae5; }
        .status-descartado { color: #dc2626; background-color: #fee2e2; }
        
        .volume-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; }
        .volume-alto { color: #991b1b; background-color: #fca5a5; }
        .volume-medio { color: #92400e; background-color: #fcd34d; }
        .volume-bajo { color: #1e3a8a; background-color: #bfdbfe; }
        .volume-none { color: #64748b; background-color: #f1f5f9; }
      </style>
      </head>
      <body>
        <h2>Lista de Leads Calificados - EcoWaste Finder</h2>
        <p>Generado el: ${new Date().toLocaleString()}</p>
        <table border="1" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Correo Electrónico</th>
              <th>Sitio Web</th>
              <th>Estado CRM</th>
              <th>Volumen Residuos</th>
              <th>Detalle Residuos</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_residuos_peligrosos_${new Date().toISOString().slice(0, 10)}.xls`);
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
          onClick={handleExportExcel} 
          className={styles.btnExport}
          disabled={filteredClients.length === 0}
        >
          📤 Descargar Excel (.xls)
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
