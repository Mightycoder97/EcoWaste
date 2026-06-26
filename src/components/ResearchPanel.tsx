'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/modules/ResearchPanel.module.css';
import { Client } from '@/models/db';

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

    addLog('🔍 Iniciando módulo de recolección de datos...');
    await new Promise((r) => setTimeout(r, 800));
    
    if (geminiKey) {
      addLog(`🌐 Preparando términos de búsqueda para "${client.name}"...`);
      await new Promise((r) => setTimeout(r, 800));
      addLog('🕸️ Consultando Google Search mediante Grounding nativo...');
      await new Promise((r) => setTimeout(r, 800));
      addLog('🤖 Conectando con servidor LLM Google Gemini (gemini-2.5-flash)...');
    } else {
      addLog(`🌐 Preparando términos de búsqueda para "${client.name}"...`);
      await new Promise((r) => setTimeout(r, 800));
      addLog('🕸️ Consultando bases de datos web e indexadores (Serper Search)...');
      await new Promise((r) => setTimeout(r, 800));
      addLog('📄 Analizando metadatos y extrayendo fragmentos de texto relevantes...');
      await new Promise((r) => setTimeout(r, 800));
      addLog('🤖 Conectando con servidor LLM DeepSeek V4 (deepseek-chat)...');
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
        throw new Error(errData.error || 'Error al ejecutar investigación en servidor.');
      }

      const data = await response.json();
      
      if (geminiKey) {
        addLog('✨ Google Gemini completó la extracción y síntesis de datos.');
      } else {
        addLog('✨ DeepSeek V4 completó la extracción y síntesis de datos.');
      }
      await new Promise((r) => setTimeout(r, 500));
      
      addLog('💾 Guardando datos enriquecidos en base de datos...');
      
      // Actualizar el cliente en el frontend
      onUpdateClient(data.client);
      setNotes(getUserNotes(data.client.notes || ''));

      await new Promise((r) => setTimeout(r, 500));
      addLog('✅ Investigación completada de forma exitosa.');
      
    } catch (error) {
      const err = error as Error;
      addLog(`❌ ERROR: ${err.message}`);
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
          className={styles.badgeVerified} 
          data-tooltip={explanation || 'Información verificada por el agente auditor.'}
        >
          ✓ Verificado
        </span>
      );
    } else if (status === 'alucinacion') {
      return (
        <span 
          className={styles.badgeHallucination} 
          data-tooltip={explanation || 'Alucinación o inconsistencia detectada en la auditoría.'}
        >
          ⚠️ Alucinación
        </span>
      );
    } else if (status === 'no_disponible') {
      return (
        <span 
          className={styles.badgeUnverified} 
          data-tooltip={explanation || 'No se encontró información en las fuentes.'}
        >
          ∅ No Disp.
        </span>
      );
    }
    return null;
  };

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera */}
        <div className={styles.drawerHeader}>
          <div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{client.name}</h3>
            <span className={`status-badge status-${client.status}`}>{client.status}</span>
          </div>
          <button className={styles.btnClose} onClick={onClose}>✕</button>
        </div>

        {/* Contenido */}
        <div className={styles.drawerContent}>
          
          {/* Información General */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Datos del Establecimiento</div>
            <div className={styles.grid}>
              <div className={styles.infoBlock}>
                <div className={styles.label}>Tipo</div>
                <div className={styles.value}>{getTypeLabel(client.type)}</div>
              </div>
              <div className={styles.infoBlock}>
                <div className={styles.label}>Ubicación</div>
                <div className={styles.value}>{client.address || 'Sin dirección registrada'}</div>
              </div>
              <div className={styles.infoBlock}>
                <div className={styles.label}>
                  <span>Teléfono</span>
                  {renderVerificationBadge('phone')}
                  {sources.phone && (
                    <a
                      href={sources.phone}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sourceLink}
                      title={`Fuente: ${sources.phone}`}
                    >
                      🔗 Fuente
                    </a>
                  )}
                </div>
                <div className={styles.value}>{client.phone || 'No registrado'}</div>
              </div>
              <div className={styles.infoBlock}>
                <div className={styles.label}>
                  <span>Correo Electrónico</span>
                  {renderVerificationBadge('email')}
                  {sources.email && (
                    <a
                      href={sources.email}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sourceLink}
                      title={`Fuente: ${sources.email}`}
                    >
                      🔗 Fuente
                    </a>
                  )}
                </div>
                <div className={styles.value}>
                  {client.email ? (
                    <a href={`mailto:${client.email}`} style={{ color: 'var(--color-primary-hover)' }}>
                      {client.email}
                    </a>
                  ) : 'No registrado'}
                </div>
              </div>
              {client.website && (
                <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
                  <div className={styles.label}>
                    <span>Sitio Web</span>
                    {renderVerificationBadge('website')}
                    {sources.website && (
                      <a
                        href={sources.website}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.sourceLink}
                        title={`Fuente: ${sources.website}`}
                      >
                        🔗 Fuente
                      </a>
                    )}
                  </div>
                  <div className={styles.value}>
                    <a href={client.website} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary-hover)' }}>
                      {client.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Síntesis de IA */}
          {synthesisText && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Análisis de la Inteligencia Artificial</div>
              <div className={styles.synthesisBox}>
                💡 <b>Síntesis DeepSeek V4:</b> {synthesisText}
              </div>
            </div>
          )}

          {/* Información de Residuos Peligrosos */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Residuos Peligrosos</div>
            <div className={styles.grid}>
              <div className={styles.infoBlock}>
                <div className={styles.label}>Volumen Estimado</div>
                <div className={styles.value} style={{
                  color: client.waste_volume === 'alto' ? 'var(--color-danger)' : 
                         client.waste_volume === 'medio' ? 'var(--color-warning)' : 
                         client.waste_volume === 'bajo' ? 'var(--color-primary)' : '#ffffff'
                }}>
                  {client.waste_volume ? `☣️ ${client.waste_volume.toUpperCase()}` : 'No analizado'}
                </div>
              </div>
              <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
                <div className={styles.label}>
                  <span>Detalle de Residuos Generados</span>
                  {renderVerificationBadge('waste_details')}
                  {sources.waste_details && (
                    <a
                      href={sources.waste_details}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sourceLink}
                      title={`Fuente: ${sources.waste_details}`}
                    >
                      🔗 Fuente
                    </a>
                  )}
                </div>
                <div className={styles.value} style={{ fontWeight: 'normal', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  {client.waste_details || 'Ejecuta el análisis de DeepSeek V4 para calificar sus desechos clínicos.'}
                </div>
              </div>
            </div>
          </div>

          {/* Contactos Clave */}
          <div className={styles.section}>
            <div className={styles.sectionTitleWithSource}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Contactos Clave (Encontrados por IA)</span>
                {renderVerificationBadge('key_contacts')}
              </div>
              {sources.key_contacts && (
                <a
                  href={sources.key_contacts}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.sourceLinkHeader}
                  title={`Fuente: ${sources.key_contacts}`}
                >
                  🔗 Ver Fuente
                </a>
              )}
            </div>
            {client.key_contacts && client.key_contacts.length > 0 ? (
              <>
                <table className={`${styles.table} ${styles.desktopTable}`}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Cargo</th>
                      <th>Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.key_contacts.map((contact, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{contact.name}</td>
                        <td>{contact.role}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                            {contact.phone && <span>📞 {contact.phone}</span>}
                            {contact.email && <span>✉️ {contact.email}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.mobileContactsList}>
                  {client.key_contacts.map((contact, idx) => (
                    <div key={idx} className={styles.contactCard}>
                      <div className={styles.contactHeader}>
                        <span className={styles.contactName}>{contact.name}</span>
                        {contact.role && <span className={styles.contactRole}>{contact.role}</span>}
                      </div>
                      <div className={styles.contactBody}>
                        {contact.phone && <div className={styles.contactDetailItem}>📞 {contact.phone}</div>}
                        {contact.email && <div className={styles.contactDetailItem}>✉️ {contact.email}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                No se han registrado personas de contacto específicas para esta sucursal.
              </p>
            )}
          </div>

          {/* Consola de Investigación */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Investigación Automatizada</div>
            
            {logs.length > 0 && (
              <div className={styles.terminal}>
                {logs.map((log, idx) => (
                  <div key={idx} className={styles.terminalLine}>
                    <span className={styles.terminalTime}>[{log.time}]</span>
                    <span>{log.text}</span>
                  </div>
                ))}
                {isAnalyzing && (
                  <div className={styles.terminalLine}>
                    <span className={styles.terminalTime}>[{new Date().toLocaleTimeString()}]</span>
                    <span>Procesando...<span className={styles.terminalCursor}>_</span></span>
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            )}

            <div className={styles.btnActionRow}>
              <button
                className={styles.btnResearch}
                onClick={handleRunDeepResearch}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '🤖 Analizando con DeepSeek...' : '⚡ Ejecutar Deep Research con DeepSeek V4'}
              </button>
            </div>
          </div>

          {/* Notas del CRM */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Notas de Seguimiento CRM</div>
            <textarea
              className={styles.notesArea}
              placeholder="Escribe notas sobre llamadas, reuniones o acuerdos de cotización con este cliente..."
              value={notes}
              onChange={handleNotesChange}
            />
            <button
              className={styles.btnResearch}
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'none' }}
              onClick={handleSaveNotesClick}
            >
              💾 Guardar Notas
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
