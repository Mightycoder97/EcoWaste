'use client';

import React, { useState } from 'react';
import { Client } from '@/models/db';
import { Eye, ArrowRight, X, MapPin } from 'lucide-react';

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
  const columns: { type: ColumnType; title: string; colorClass: string }[] = [
    { type: 'nuevo', title: 'Nuevo', colorClass: 'text-muted-foreground' },
    { type: 'contactado', title: 'Contactado', colorClass: 'text-blue-400' },
    { type: 'negociacion', title: 'En Negociación', colorClass: 'text-yellow-400' },
    { type: 'ganado', title: 'Ganado', colorClass: 'text-green-400' },
    { type: 'descartado', title: 'Descartado', colorClass: 'text-red-400' },
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
    <div className="flex-1 flex flex-row gap-4 overflow-x-auto min-h-0 select-none pb-4 scrollbar-thin">
      {columns.map((col) => {
        const colClients = clientsByColumn[col.type] || [];
        const isOver = dragOverColumn === col.type;

        return (
          <div
            key={col.type}
            className={`flex flex-col w-72 shrink-0 bg-card/30 border border-border rounded-xl p-3 gap-3 transition-colors duration-150 ${
              isOver ? 'border-foreground/20 bg-muted/10' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, col.type)}
            onDrop={() => handleDrop(col.type)}
            onDragLeave={() => setDragOverColumn(null)}
          >
            {/* Header de la columna */}
            <div className="flex items-center justify-between py-1 border-b border-border/40 pb-2">
              <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  col.type === 'nuevo' ? 'bg-zinc-400' :
                  col.type === 'contactado' ? 'bg-blue-400' :
                  col.type === 'negociacion' ? 'bg-yellow-400' :
                  col.type === 'ganado' ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className="text-foreground">{col.title}</span>
              </div>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                {colClients.length}
              </span>
            </div>

            {/* Listado de Tarjetas */}
            <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 scrollbar-none">
              {colClients.map((client) => {
                const nextStatus = getNextStatus(client.status);
                
                return (
                  <div
                    key={client.id}
                    className="bg-card border border-border/70 rounded-lg p-3.5 flex flex-col gap-2 hover:border-foreground/30 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all"
                    draggable
                    onDragStart={() => handleDragStart(client.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="text-xs font-semibold text-foreground leading-normal">{client.name}</div>
                    
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground font-medium">
                        {getTypeLabel(client.type)}
                      </span>
                      {client.waste_volume && (
                        <span className={`text-[9px] font-semibold font-mono uppercase ${
                          client.waste_volume === 'alto' ? 'text-red-400' : 
                          client.waste_volume === 'medio' ? 'text-yellow-400' : 'text-zinc-400'
                        }`}>
                          {client.waste_volume}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1" title={client.address}>
                      <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{client.address || 'Sin dirección'}</span>
                    </div>

                    {(client.phone || client.email) && (
                      <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/40">
                        {client.phone && <span>📞 {client.phone}</span>}
                        {client.email && <span className="truncate">✉️ {client.email}</span>}
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-1 border-t border-border/40 pt-2">
                      <button
                        onClick={() => onSelectClient(client)}
                        className="h-7 flex-1 border border-border rounded text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ficha</span>
                      </button>

                      {nextStatus && (
                        <button
                          onClick={() => onUpdateClientStatus(client.id, nextStatus)}
                          className="h-7 w-7 border border-border rounded flex items-center justify-center cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title={`Mover a ${nextStatus}`}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      
                      {client.status !== 'descartado' && (
                        <button
                          onClick={() => onUpdateClientStatus(client.id, 'descartado')}
                          className="h-7 w-7 border border-border rounded flex items-center justify-center cursor-pointer hover:bg-muted text-red-400/80 hover:text-red-400 transition-colors"
                          title="Descartar prospecto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {colClients.length === 0 && (
                <div className="py-10 text-center text-muted-foreground text-[10px] border border-dashed border-border rounded-lg bg-muted/5">
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
