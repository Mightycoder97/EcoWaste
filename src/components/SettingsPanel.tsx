'use client';

import React, { useState, useEffect } from 'react';
import { Key, Database, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsPanelProps {
  onSettingsChange: () => void;
}

export default function SettingsPanel({ onSettingsChange }: SettingsPanelProps) {
  const [geminiKey, setGeminiKey] = useState('');
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
    const savedGeminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
    const savedDeepseekKey = localStorage.getItem('DS_API_KEY') || 'sk-f9a0f8949ddd4e15a9445a1813f70942';
    const savedSerperKey = localStorage.getItem('SERPER_API_KEY') || '';
    const savedSupabaseUrl = localStorage.getItem('SB_URL') || '';
    const savedSupabaseKey = localStorage.getItem('SB_ANON_KEY') || '';

    setGeminiKey(savedGeminiKey);
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
    localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
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
    <div className="flex flex-col gap-6 w-full text-foreground select-none">
      <div className="flex flex-col gap-1 border-b border-border/40 pb-4">
        <h2 className="text-lg font-semibold text-foreground">Configuración</h2>
        <p className="text-xs text-muted-foreground leading-normal">
          Gestiona las claves de servicios y la conexión a la base de datos persistente. Todos los datos se guardan de forma local en tu navegador.
        </p>
      </div>

      {/* Database Connection Status Banner */}
      <div className="flex items-center gap-4 bg-muted/20 border border-border p-4 rounded-lg shadow-sm">
        {supabaseStatus === 'connected' ? (
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
        ) : (
          <Database className="w-5 h-5 text-zinc-400 shrink-0" />
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-xs font-semibold text-foreground">
            {supabaseStatus === 'connected' 
              ? 'Conexión activa a base de datos externa (Supabase)' 
              : 'Almacenamiento local activo (LocalStorage)'}
          </h3>
          <p className="text-[11px] text-muted-foreground leading-normal">
            {supabaseStatus === 'connected'
              ? 'Los prospectos y análisis se sincronizan automáticamente con tu instancia remota de Supabase.'
              : 'No se detectaron credenciales de base de datos remota. Toda la información se mantendrá de forma local en este dispositivo.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4 shadow-sm">
        <div className="border-b border-border/40 pb-3 mb-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <span>Integraciones y Claves de API</span>
          </h3>
        </div>

        {isSaved && (
          <div className="flex items-center gap-2 bg-green-950/20 border border-green-900/40 text-green-300 px-4 py-3 rounded-lg text-xs">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span>Configuración guardada correctamente. Conexiones actualizadas.</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="gemini-key" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Google Gemini API Key</span>
            <span className="text-[10px] text-muted-foreground font-normal">Recomendado (Grounding Nativo)</span>
          </label>
          <input
            id="gemini-key"
            type="password"
            placeholder="AIzaSy..."
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground leading-normal">
            Utilizada para la calificación con búsqueda nativa integrada en un solo agente. Su configuración reemplaza el flujo secundario.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="deepseek-key" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>DeepSeek API Key</span>
            <span className="text-[10px] text-muted-foreground font-normal">Opcional (Respaldo)</span>
          </label>
          <input
            id="deepseek-key"
            type="password"
            placeholder="sk-..."
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={deepseekKey}
            onChange={(e) => setDeepseekKey(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground leading-normal">
            Clave utilizada como procesador secundario para estructurar resultados de búsqueda y análisis de volumen.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="serper-key" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Serper.dev API Key</span>
            <span className="text-[10px] text-muted-foreground font-normal">Opcional (Búsqueda Web)</span>
          </label>
          <input
            id="serper-key"
            type="password"
            placeholder="Clave de API de Serper"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={serperKey}
            onChange={(e) => setSerperKey(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground leading-normal">
            Permite realizar búsquedas en tiempo real para recopilar información pública de los establecimientos. De lo contrario se simulará una recopilación realista.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="supabase-url" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Supabase URL</span>
            <span className="text-[10px] text-muted-foreground font-normal">Opcional</span>
          </label>
          <input
            id="supabase-url"
            type="text"
            placeholder="https://xxxxxx.supabase.co"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="supabase-key" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Supabase Anon Key</span>
            <span className="text-[10px] text-muted-foreground font-normal">Opcional</span>
          </label>
          <input
            id="supabase-key"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground leading-normal">
            Ingresa las credenciales de Supabase para activar la sincronización con el servidor remoto.
          </p>
        </div>

        <button 
          type="submit" 
          className="h-9 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold px-4 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors shadow self-start mt-2"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar Configuración</span>
        </button>
      </form>
    </div>
  );
}
