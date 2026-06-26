'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@/models/db';
import { 
  X, 
  Sparkles, 
  Phone, 
  Mail, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Terminal, 
  FileText, 
  Link, 
  Save 
} from 'lucide-react';

interface ResearchPanelProps {
  client: Client;
  onClose: () => void;
  onUpdateClient: (updatedClient: Client) => void;
  onSaveNotes: (id: string, notes: string) => void;
}

interface TerminalLog {
  time: string;
  text: string;
}

export default function ResearchPanel({
  client,
  onClose,
  onUpdateClient,
  onSaveNotes,
}: ResearchPanelProps) {
  const getUserNotes = (fullNotes: string) => {
    const idx = fullNotes.indexOf('[IA Síntesis]:');
    if (idx === -1) return fullNotes.trim();
    return fullNotes.substring(0, idx).trim();
  };

  const [notes, setNotes] = useState(() => getUserNotes(client.notes || ''));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Scroll al final del terminal cuando se agregan logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, text }]);
  };

  const handleRunDeepResearch = async () => {
    setIsAnalyzing(true);
    setLogs([]);
    
    const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
    const dsKey = localStorage.getItem('DS_API_KEY') || 'sk-f9a0f8949ddd4e15a9445a1813f70942';
    const spKey = localStorage.getItem('SERPER_API_KEY') || '';

    addLog('Iniciando módulo de recolección de datos...');
    await new Promise((r) => setTimeout(r, 600));
    
    if (geminiKey) {
      addLog(`Preparando términos de búsqueda para "${client.name}"...`);
      await new Promise((r) => setTimeout(r, 600));
      addLog('Consultando Web mediante Search Grounding...');
      await new Promise((r) => setTimeout(r, 600));
      addLog('Conectando con modelo de inteligencia...');
    } else {
      addLog(`Preparando términos de búsqueda para "${client.name}"...`);
      await new Promise((r) => setTimeout(r, 600));
      addLog('Consultando bases de datos indexadas...');
      await new Promise((r) => setTimeout(r, 600));
      addLog('Extrayendo fragmentos de texto relevantes...');
      await new Promise((r) => setTimeout(r, 600));
      addLog('Conectando con servidor de procesamiento...');
    }
    
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client,
          keys: {
            geminiKey,
            deepseekKey: dsKey,
            serperKey: spKey,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al ejecutar análisis en el servidor.');
      }

      const data = await response.json();
      
      addLog('Extracción y síntesis de datos completada.');
      await new Promise((r) => setTimeout(r, 400));
      addLog('Guardando datos actualizados...');
      
      // Actualizar el cliente en el frontend
      onUpdateClient(data.client);
      setNotes(getUserNotes(data.client.notes || ''));

      await new Promise((r) => setTimeout(r, 400));
      addLog('Calificación completada con éxito.');
      
    } catch (error) {
      const err = error as Error;
      addLog(`ERROR: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleSaveNotesClick = () => {
    // Reconstruir las notas completas con los bloques de IA existentes si es que existen
    let fullNotes = notes.trim();
    const iaSynthesisIdx = client.notes?.indexOf('[IA Síntesis]:');
    if (iaSynthesisIdx !== undefined && iaSynthesisIdx !== -1) {
      const iaPart = client.notes!.substring(iaSynthesisIdx);
      fullNotes = fullNotes ? `${fullNotes}\n\n${iaPart}` : iaPart;
    }
    onSaveNotes(client.id, fullNotes);
    alert('Notas guardadas correctamente.');
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

  // Extraer síntesis, fuentes y auditoría desde las notas completas del cliente
  const fullNotes = client.notes || '';
  const hasSynthesis = fullNotes.includes('[IA Síntesis]:');
  
  let synthesisText: string | null = null;
  let sources: {
    phone?: string;
    email?: string;
    website?: string;
    waste_details?: string;
    key_contacts?: string;
  } = {};
  let audit: {
    [key: string]: {
      status: 'verificado' | 'alucinacion' | 'no_disponible';
      explanation: string;
    };
  } = {};

  if (hasSynthesis) {
    const synthesisParts = fullNotes.split('[IA Síntesis]:');
    let iaPart = synthesisParts[1] || '';
    
    // Extraer IA Auditoria si existe
    if (iaPart.includes('[IA Auditoria]:')) {
      const auditParts = iaPart.split('[IA Auditoria]:');
      const auditJsonText = auditParts[1]?.trim();
      try {
        audit = JSON.parse(auditJsonText || '{}');
      } catch (e) {
        console.error('Error parsing IA Auditoria:', e);
      }
      iaPart = auditParts[0] || '';
    }

    // Extraer IA Fuentes si existe
    if (iaPart.includes('[IA Fuentes]:')) {
      const sourcesParts = iaPart.split('[IA Fuentes]:');
      const sourcesJsonText = sourcesParts[1]?.trim();
      try {
        sources = JSON.parse(sourcesJsonText || '{}');
      } catch (e) {
        console.error('Error parsing IA Fuentes:', e);
      }
      synthesisText = sourcesParts[0]?.trim();
    } else {
      synthesisText = iaPart.trim();
    }
  }

  const renderVerificationBadge = (fieldKey: string) => {
    const fieldAudit = audit[fieldKey];
    if (!fieldAudit) return null;

    const { status, explanation } = fieldAudit;
    if (status === 'verificado') {
      return (
        <span 
          className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-400 bg-green-950/20 border border-green-900/30 px-1.5 py-0.5 rounded-full cursor-help"
          title={explanation || 'Información verificada con fuentes web.'}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Verificado</span>
        </span>
      );
    } else if (status === 'alucinacion') {
      return (
        <span 
          className="inline-flex items-center gap-1 text-[9px] font-semibold text-red-400 bg-red-950/20 border border-red-900/30 px-1.5 py-0.5 rounded-full cursor-help"
          title={explanation || 'Inconsistencia detectada en las fuentes.'}
        >
          <AlertCircle className="w-2.5 h-2.5" />
          <span>Inconsistencia</span>
        </span>
      );
    } else if (status === 'no_disponible') {
      return (
        <span 
          className="inline-flex items-center gap-1 text-[9px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-full cursor-help"
          title={explanation || 'No se localizó información pública.'}
        >
          <HelpCircle className="w-2.5 h-2.5" />
          <span>Sin registro</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate max-w-[360px]">{client.name}</h3>
            <div>
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
          </div>
          <button 
            className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md flex items-center justify-center cursor-pointer transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-thin">
          
          {/* Información General */}
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Ficha del Establecimiento</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tipo</div>
                <div className="text-xs font-semibold text-foreground">{getTypeLabel(client.type)}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ubicación</div>
                <div className="text-xs font-semibold text-foreground leading-normal">{client.address || 'Sin dirección registrada'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>Teléfono</span>
                  {renderVerificationBadge('phone')}
                  {sources.phone && (
                    <a href={sources.phone} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Ver origen del dato">
                      <Link className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className="text-xs font-semibold text-foreground">{client.phone || 'No registrado'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>Correo Electrónico</span>
                  {renderVerificationBadge('email')}
                  {sources.email && (
                    <a href={sources.email} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Ver origen del dato">
                      <Link className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className="text-xs font-semibold text-foreground truncate">
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="underline hover:text-muted-foreground">
                      {client.email}
                    </a>
                  ) : 'No registrado'}
                </div>
              </div>
              {client.website && (
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>Sitio Web</span>
                    {renderVerificationBadge('website')}
                    {sources.website && (
                      <a href={sources.website} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Ver origen del dato">
                        <Link className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-foreground truncate">
                    <a href={client.website} target="_blank" rel="noreferrer" className="underline hover:text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      <span>{client.website}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumen de Datos Enriquecidos */}
          {synthesisText && (
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">
                Resumen de Información
              </div>
              <div className="bg-muted/20 border border-border/80 rounded-lg p-4 text-xs leading-relaxed text-muted-foreground">
                {synthesisText}
              </div>
            </div>
          )}

          {/* Información de Residuos */}
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5">
              Calificación de Residuos Peligrosos
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Volumen Estimado</div>
                <div className="mt-0.5">
                  {client.waste_volume ? (
                    <span className={`inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                      client.waste_volume === 'alto' ? 'bg-red-950/20 text-red-300 border border-red-900/30' :
                      client.waste_volume === 'medio' ? 'bg-yellow-950/20 text-yellow-300 border border-yellow-900/30' : 
                      'bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}>
                      {client.waste_volume}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sin calificar</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>Detalle de Desechos</span>
                  {renderVerificationBadge('waste_details')}
                  {sources.waste_details && (
                    <a href={sources.waste_details} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="Ver origen del dato">
                      <Link className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className="text-xs text-muted-foreground leading-normal">
                  {client.waste_details || 'Ejecuta el análisis automático para obtener información sobre los desechos médicos generados.'}
                </div>
              </div>
            </div>
          </div>

          {/* Contactos Clave */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>Personal Clave Identificado</span>
                {renderVerificationBadge('key_contacts')}
              </div>
              {sources.key_contacts && (
                <a href={sources.key_contacts} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" title="Ver origen del dato">
                  <Link className="w-3 h-3" />
                  <span>Ver origen</span>
                </a>
              )}
            </div>
            
            {client.key_contacts && client.key_contacts.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden bg-card/40">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/60 text-[9px] uppercase font-semibold text-muted-foreground">
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Cargo</th>
                      <th className="px-3 py-2">Datos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {client.key_contacts.map((contact, idx) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="px-3 py-2 font-semibold text-foreground">{contact.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{contact.role}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <div className="flex flex-col gap-0.5 text-[10px]">
                            {contact.phone && <span>📞 {contact.phone}</span>}
                            {contact.email && <span className="underline truncate max-w-[120px]">{contact.email}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                No se han registrado personas de contacto específicas para este establecimiento.
              </p>
            )}
          </div>

          {/* Consola de Análisis */}
          <div className="flex flex-col gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Consola de Calificación</span>
            </div>
            
            {logs.length > 0 && (
              <div className="bg-background border border-border rounded-lg p-4 font-mono text-[10px] text-muted-foreground flex flex-col gap-1.5 h-40 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-normal flex gap-2">
                    <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                    <span>{log.text}</span>
                  </div>
                ))}
                {isAnalyzing && (
                  <div className="text-foreground animate-pulse">
                    Procesando...
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            )}

            <button
              className="h-9 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors shadow disabled:opacity-50"
              onClick={handleRunDeepResearch}
              disabled={isAnalyzing}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Analizando...' : 'Calificar e Investigar Establecimiento'}</span>
            </button>
          </div>

          {/* Notas del CRM */}
          <div className="flex flex-col gap-3 border-t border-border/40 pt-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notas de Seguimiento CRM
            </div>
            <textarea
              className="w-full h-28 bg-transparent border border-input rounded-md p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring resize-none text-foreground placeholder:text-muted-foreground"
              placeholder="Registrar notas sobre llamadas, reuniones o acuerdos de cotización..."
              value={notes}
              onChange={handleNotesChange}
            />
            <button
              className="h-9 border border-border hover:bg-muted text-xs font-semibold rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors text-muted-foreground hover:text-foreground w-full"
              onClick={handleSaveNotesClick}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Notas</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
