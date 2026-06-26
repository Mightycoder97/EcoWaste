'use client';

import React, { useState, useMemo } from 'react';
import { Client } from '@/models/db';
import { 
  Search, 
  Download, 
  Eye, 
  Plus, 
  Sparkles, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface LeadTableProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onInvestigateClient: (client: Client) => void;
  onSaveToCRM: (client: Client) => void;
  savedIds: Set<string>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
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
        th { background-color: #f4f4f5; color: #09090b; font-weight: bold; border: 1px solid #e4e4e7; padding: 10px; text-align: left; }
        .type-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; color: #71717a; background-color: #f4f4f5; border: 1px solid #e4e4e7; }
        
        .status-badge { font-weight: bold; font-size: 9pt; padding: 2px 6px; border-radius: 4px; }
        .status-nuevo { color: #71717a; background-color: #f4f4f5; }
        .status-contactado { color: #2563eb; background-color: #dbeafe; }
        .status-negociacion { color: #d97706; background-color: #fef3c7; }
        .status-ganado { color: #059669; background-color: #d1fae5; }
        .status-descartado { color: #dc2626; background-color: #fee2e2; }
        
        .volume-badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; }
        .volume-alto { color: #991b1b; background-color: #fca5a5; }
        .volume-medio { color: #92400e; background-color: #fcd34d; }
        .volume-bajo { color: #1e3a8a; background-color: #bfdbfe; }
        .volume-none { color: #71717a; background-color: #f4f4f5; }
      </style>
      </head>
      <body>
        <h2>Lista de Leads Calificados - EcoWaste</h2>
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
    <div className="flex flex-col gap-4 w-full text-foreground select-none">
      
      {/* Filtros */}
      <div className="flex flex-col gap-3 bg-card border border-border p-4 rounded-lg shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card text-foreground px-2 text-[11px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full cursor-pointer"
          >
            <option value="">Todos los tipos</option>
            <option value="hospital">Hospitales</option>
            <option value="clinic">Clínicas</option>
            <option value="laboratory">Laboratorios</option>
            <option value="dentist">Dentistas</option>
            <option value="veterinary">Veterinarias</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card text-foreground px-2 text-[11px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full cursor-pointer"
          >
            <option value="">Todos los estados</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="negociacion">En Negociación</option>
            <option value="ganado">Cerrado (Ganado)</option>
            <option value="descartado">Descartado</option>
          </select>

          <button 
            onClick={handleExportExcel} 
            className="h-9 border border-border hover:bg-muted text-[11px] font-semibold px-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors w-full text-muted-foreground hover:text-foreground shrink-0 truncate"
            disabled={filteredClients.length === 0}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Tabla (Escritorio) */}
      <div className="hidden sm:block border border-border rounded-lg overflow-x-auto bg-card shadow-sm">
        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground px-4">
            {clients.length === 0 
              ? 'Ingresa una ubicación y presiona "Buscar cercanos" para comenzar.' 
              : 'No se encontraron establecimientos en esta vista.'}
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/80 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                {selectedIds && onToggleSelectAll && (
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={filteredClients.length > 0 && filteredClients.every((c) => selectedIds.has(c.id))}
                      onChange={() => onToggleSelectAll(filteredClients.map((c) => c.id))}
                      className="cursor-pointer rounded border-input text-primary focus:ring-ring w-4 h-4"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Establecimiento</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Volumen</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredClients.map((client) => {
                const isSaved = savedIds.has(client.id);
                
                return (
                  <tr 
                    key={client.id} 
                    className={`hover:bg-muted/20 transition-colors ${
                      selectedIds?.has(client.id) ? 'bg-muted/10' : ''
                    }`}
                  >
                    {selectedIds && onToggleSelect && (
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(client.id)}
                          onChange={() => onToggleSelect(client.id)}
                          className="cursor-pointer rounded border-input text-primary focus:ring-ring w-4 h-4"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground leading-snug">{client.name}</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-semibold ${
                          client.status === 'nuevo' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' :
                          client.status === 'contactado' ? 'bg-blue-950/20 text-blue-300 border border-blue-900/30' :
                          client.status === 'negociacion' ? 'bg-yellow-950/20 text-yellow-300 border border-yellow-900/30' :
                          client.status === 'ganado' ? 'bg-green-950/20 text-green-300 border border-green-900/30' :
                          'bg-red-950/20 text-red-300 border border-red-900/30'
                        }`}>
                          {client.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground font-medium">
                        {getTypeLabel(client.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-[200px] truncate text-xs text-muted-foreground" title={client.address}>
                        {client.address || 'Sin dirección'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {client.phone && <span>{client.phone}</span>}
                        {client.email && (
                          <a href={`mailto:${client.email}`} className="text-foreground hover:underline truncate max-w-[150px]">
                            {client.email}
                          </a>
                        )}
                        {!client.phone && !client.email && (
                          <span className="text-[10px] italic">No calificado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {client.waste_volume ? (
                        <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                          client.waste_volume === 'alto' ? 'bg-red-950/20 text-red-300 border border-red-900/30' :
                          client.waste_volume === 'medio' ? 'bg-yellow-950/20 text-yellow-300 border border-yellow-900/30' : 
                          'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                          {client.waste_volume}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Sin analizar</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectClient(client)}
                          className="h-8 px-2.5 hover:bg-muted text-xs font-semibold rounded-md border border-border flex items-center gap-1 cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                          title="Ver ficha"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ficha</span>
                        </button>
                        
                        {!isSaved && (
                          <button
                            onClick={() => onSaveToCRM(client)}
                            className="h-8 px-2.5 hover:bg-muted text-xs font-semibold rounded-md border border-border flex items-center gap-1 cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                            title="Añadir a CRM"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>CRM</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => onInvestigateClient(client)}
                          className="h-8 px-2.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                          title="Investigar con IA"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Analizar</span>
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
      <div className="block sm:hidden flex flex-col gap-3">
        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground bg-card border border-border rounded-lg px-4">
            {clients.length === 0 
              ? 'Ingresa una ubicación y presiona "Buscar cercanos" para comenzar.' 
              : 'No se encontraron establecimientos.'}
          </div>
        ) : (
          filteredClients.map((client) => {
            const isSaved = savedIds.has(client.id);
            const isChecked = selectedIds?.has(client.id);
            
            return (
              <div 
                key={client.id} 
                className={`bg-card border rounded-lg p-4 flex flex-col gap-3 transition-colors ${
                  isChecked ? 'border-foreground/40 bg-muted/10' : 'border-border'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-foreground text-sm">{client.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-semibold ${
                        client.status === 'nuevo' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' :
                        client.status === 'contactado' ? 'bg-blue-950/20 text-blue-300 border border-blue-900/30' :
                        client.status === 'negociacion' ? 'bg-yellow-950/20 text-yellow-300 border border-yellow-900/30' :
                        client.status === 'ganado' ? 'bg-green-950/20 text-green-300 border border-green-900/30' :
                        'bg-red-950/20 text-red-300 border border-red-900/30'
                      }`}>
                        {client.status}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground font-medium">
                        {getTypeLabel(client.type)}
                      </span>
                    </div>
                  </div>
                  {selectedIds && onToggleSelect && (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect(client.id)}
                      className="cursor-pointer rounded border-input text-primary focus:ring-ring w-4.5 h-4.5"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-xs border-t border-border/40 pt-3">
                  <div className="flex items-start gap-1">
                    <span className="text-muted-foreground w-16 shrink-0">Ubicación:</span>
                    <span className="text-foreground">{client.address || 'Sin dirección'}</span>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-muted-foreground w-16 shrink-0">Contacto:</span>
                    <div className="flex flex-col text-foreground">
                      {client.phone && <span>{client.phone}</span>}
                      {client.email && <a href={`mailto:${client.email}`} className="underline">{client.email}</a>}
                      {!client.phone && !client.email && <span className="italic text-muted-foreground">No calificado</span>}
                    </div>
                  </div>

                  <div className="flex items-start gap-1">
                    <span className="text-muted-foreground w-16 shrink-0">Volumen:</span>
                    {client.waste_volume ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                        client.waste_volume === 'alto' ? 'bg-red-950/20 text-red-300 border border-red-900/30' :
                        client.waste_volume === 'medio' ? 'bg-yellow-950/20 text-yellow-300 border border-yellow-900/30' : 
                        'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {client.waste_volume}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Sin analizar</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-border/40 pt-3 mt-1">
                  <button
                    onClick={() => onSelectClient(client)}
                    className="flex-1 h-8 hover:bg-muted text-xs font-semibold rounded-md border border-border flex items-center justify-center gap-1 cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ficha</span>
                  </button>
                  
                  {!isSaved && (
                    <button
                      onClick={() => onSaveToCRM(client)}
                      className="flex-1 h-8 hover:bg-muted text-xs font-semibold rounded-md border border-border flex items-center justify-center gap-1 cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>CRM</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => onInvestigateClient(client)}
                    className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold rounded-md flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analizar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Barra flotante de acciones en lote */}
      {selectedIds && selectedIds.size > 0 && onBulkInvestigate && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border px-5 py-4 rounded-xl shadow-lg flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 w-[90%] max-w-md md:w-auto">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <div className="text-xs font-semibold text-foreground">
                {selectedIds.size} {selectedIds.size === 1 ? 'establecimiento seleccionado' : 'establecimientos seleccionados'}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">Listo para análisis automático en lote</div>
            </div>
          </div>
          <button 
            onClick={onBulkInvestigate} 
            className="h-8 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold px-3 rounded-md flex items-center gap-1 cursor-pointer shrink-0 transition-colors shadow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analizar selección</span>
          </button>
        </div>
      )}
    </div>
  );
}
