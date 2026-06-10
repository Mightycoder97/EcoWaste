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
  const [notes, setNotes] = useState(() => client.notes || '');
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
    
    addLog('🔍 Iniciando módulo de recolección de datos...');
    
    // Simular pasos iniciales de recolección de datos para experiencia visual fluida
    await new Promise((r) => setTimeout(r, 800));
    addLog(`🌐 Preparando términos de búsqueda para "${client.name}"...`);
    
    await new Promise((r) => setTimeout(r, 800));
    addLog('🕸️ Consultando bases de datos web e indexadores (Serper Search)...');
    
    await new Promise((r) => setTimeout(r, 800));
    addLog('📄 Analizando metadatos y extrayendo fragmentos de texto relevantes...');
    
    await new Promise((r) => setTimeout(r, 800));
    addLog('🤖 Conectando con servidor LLM DeepSeek V4 (deepseek-chat)...');
    
    try {
      // Obtener credenciales desde localStorage para pasar al backend
      const dsKey = localStorage.getItem('DS_API_KEY') || 'sk-f9a0f8949ddd4e15a9445a1813f70942';
      const spKey = localStorage.getItem('SERPER_API_KEY') || '';

      const response = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client,
          keys: {
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
      
      addLog('✨ DeepSeek V4 completó la extracción y síntesis de datos.');
      await new Promise((r) => setTimeout(r, 500));
      
      addLog('💾 Guardando datos enriquecidos en base de datos...');
      
      // Actualizar el cliente en el frontend
      onUpdateClient(data.client);
      setNotes(data.client.notes || '');

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
    onSaveNotes(client.id, notes);
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

  // Extraer síntesis si existe en las notas
  const hasSynthesis = notes.includes('[IA Síntesis]:');
  const synthesisText = hasSynthesis 
    ? notes.split('[IA Síntesis]:')[1]?.trim()
    : null;
  
  // Limpiar notas para no mostrar la síntesis en la caja editable si no se desea,
  // pero para simplificar, permitimos editar todo.

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
                <div className={styles.label}>Teléfono</div>
                <div className={styles.value}>{client.phone || 'No registrado'}</div>
              </div>
              <div className={styles.infoBlock}>
                <div className={styles.label}>Correo Electrónico</div>
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
                  <div className={styles.label}>Sitio Web</div>
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
                <div className={styles.label}>Detalle de Residuos Generados</div>
                <div className={styles.value} style={{ fontWeight: 'normal', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                  {client.waste_details || 'Ejecuta el análisis de DeepSeek V4 para calificar sus desechos clínicos.'}
                </div>
              </div>
            </div>
          </div>

          {/* Contactos Clave */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Contactos Clave (Encontrados por IA)</div>
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
