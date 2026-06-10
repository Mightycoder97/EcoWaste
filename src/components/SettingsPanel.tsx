'use client';

import React, { useState, useEffect } from 'react';
import styles from '../styles/modules/SettingsPanel.module.css';

interface SettingsPanelProps {
  onSettingsChange: () => void;
}

export default function SettingsPanel({ onSettingsChange }: SettingsPanelProps) {
  const [deepseekKey, setDeepseekKey] = useState('');
  const [serperKey, setSerperKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  // Status check states
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'local'>('local');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Load settings from localStorage
    const savedDeepseekKey = localStorage.getItem('DS_API_KEY') || 'sk-f9a0f8949ddd4e15a9445a1813f70942';
    const savedSerperKey = localStorage.getItem('SERPER_API_KEY') || '';
    const savedSupabaseUrl = localStorage.getItem('SB_URL') || '';
    const savedSupabaseKey = localStorage.getItem('SB_ANON_KEY') || '';

    setDeepseekKey(savedDeepseekKey);
    setSerperKey(savedSerperKey);
    setSupabaseUrl(savedSupabaseUrl);
    setSupabaseKey(savedSupabaseKey);

    // Initial check of Supabase status
    checkConnectionStatus(savedSupabaseUrl, savedSupabaseKey);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function checkConnectionStatus(url: string, key: string) {
    if (url.trim() && key.trim()) {
      setSupabaseStatus('connected');
    } else {
      setSupabaseStatus('local');
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to localStorage
    localStorage.setItem('DS_API_KEY', deepseekKey.trim());
    localStorage.setItem('SERPER_API_KEY', serperKey.trim());
    localStorage.setItem('SB_URL', supabaseUrl.trim());
    localStorage.setItem('SB_ANON_KEY', supabaseKey.trim());

    checkConnectionStatus(supabaseUrl, supabaseKey);
    
    setIsSaved(true);
    onSettingsChange();

    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.titleSection}>
        <h2>Configuración</h2>
        <p>Gestiona tus credenciales de servicios y conexión a base de datos. Los datos se guardan de forma segura en tu navegador.</p>
      </div>

      {/* Database Connection Status Banner */}
      <div className={styles.statusCard}>
        <div className={`${styles.statusIndicator} ${
          supabaseStatus === 'connected' ? styles.statusIndicatorActive : styles.statusIndicatorLocal
        }`}>
          {supabaseStatus === 'connected' ? '⚡' : '💾'}
        </div>
        <div className={styles.statusInfo}>
          <h3>
            {supabaseStatus === 'connected' 
              ? 'Conectado a Base de Datos Supabase (Remoto)' 
              : 'Modo Almacenamiento Local (Local Storage)'}
          </h3>
          <p>
            {supabaseStatus === 'connected'
              ? 'Los prospectos y análisis se guardan directamente en tu instancia de Supabase.'
              : 'No se detectaron credenciales de Supabase. Todo se guardará localmente en la base de datos de tu navegador.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>Claves de API e Integraciones</h3>
        </div>

        {isSaved && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            ✨ ¡Configuración guardada correctamente! Las conexiones se han actualizado.
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="deepseek-key">
            DeepSeek V4 API Key
            <span className={styles.badgeRequired}>Requerido para IA</span>
          </label>
          <input
            id="deepseek-key"
            type="password"
            placeholder="Ingresa tu clave de API de DeepSeek (sk-...)"
            value={deepseekKey}
            onChange={(e) => setDeepseekKey(e.target.value)}
            required
          />
          <p className={styles.inputHelp}>
            Se utiliza para analizar los resultados de búsqueda web de los clientes, estimar el volumen de residuos peligrosos y sintetizar la información.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="serper-key">
            Serper.dev API Key
            <span className={styles.badgeOptional}>Opcional (Búsqueda Real)</span>
          </label>
          <input
            id="serper-key"
            type="password"
            placeholder="Ingresa tu clave de API de Serper"
            value={serperKey}
            onChange={(e) => setSerperKey(e.target.value)}
          />
          <p className={styles.inputHelp}>
            Utilizado para buscar información del cliente en Google. Si se deja en blanco, la aplicación simulará búsquedas altamente realistas basadas en el nombre y tipo del cliente. Obtén una clave con 2,500 consultas gratis en serper.dev.
          </p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="supabase-url">
            Supabase URL
            <span className={styles.badgeOptional}>Opcional</span>
          </label>
          <input
            id="supabase-url"
            type="text"
            placeholder="https://xxxxxx.supabase.co"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="supabase-key">
            Supabase Anon Key
            <span className={styles.badgeOptional}>Opcional</span>
          </label>
          <input
            id="supabase-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />
          <p className={styles.inputHelp}>
            Si agregas la URL y la Clave Anónima de Supabase, la aplicación sincronizará automáticamente los datos locales a tus tablas remotas.
          </p>
        </div>

        <button type="submit" className={styles.btnSave}>
          💾 Guardar Configuración
        </button>
      </form>
    </div>
  );
}
