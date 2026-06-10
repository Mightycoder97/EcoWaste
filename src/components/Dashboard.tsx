'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import styles from '../styles/modules/Dashboard.module.css';
import SettingsPanel from './SettingsPanel';
import LeadTable from './LeadTable';
import CRMBoard from './CRMBoard';
import ResearchPanel from './ResearchPanel';
import { Client } from '@/models/db';

// Cargar MapView dinámicamente desactivando SSR, ya que Leaflet usa window/document
const MapView = dynamic(() => import('./MapView'), { ssr: false });

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'buscador' | 'tabla' | 'crm' | 'configuracion'>('buscador');
  
  // Search state
  const [latInput, setLatInput] = useState('-33.4489'); // Coordenadas por defecto (Santiago, Chile)
  const [lonInput, setLonInput] = useState('-70.6693');
  const [radiusInput, setRadiusInput] = useState('4000');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['hospital', 'clinic', 'laboratory']);
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeSearchEngine, setActiveSearchEngine] = useState<string>('');

  // Bulk selection and progress states
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, activeName: '' });
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);

  const getUserLocation = (silent: boolean = false) => {
    if (!navigator.geolocation) {
      if (!silent) alert('La geolocalización no es compatible con este navegador.');
      return;
    }

    if (!silent) setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatInput(lat.toFixed(4));
        setLonInput(lon.toFixed(4));
        if (!silent) setIsLocating(false);
        console.log(`[Dashboard] Ubicación inicial/usuario obtenida: Lat: ${lat}, Lon: ${lon}`);
      },
      (error) => {
        if (!silent) {
          setIsLocating(false);
          let errorMsg = 'No se pudo obtener tu ubicación actual.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Permiso denegado. Por favor, habilita el acceso a la ubicación en tu navegador.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'La información de ubicación no está disponible.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Tiempo de espera agotado al consultar tu ubicación.';
          }
          alert(errorMsg);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Database state
  const [savedClients, setSavedClients] = useState<Client[]>([]);
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);

  // Selected client for side drawer
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Mobile navigation and view toggling
  const [searchViewMode, setSearchViewMode] = useState<'mapa' | 'lista'>('mapa');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 1. Cargar clientes al iniciar o cambiar configuraciones
  useEffect(() => {
    loadDatabaseMode();
    loadSavedClients();
    // Obtener ubicación de la computadora automáticamente por defecto
    getUserLocation(true);
  }, []);

  function loadDatabaseMode() {
    const sbUrl = localStorage.getItem('SB_URL') || '';
    const sbKey = localStorage.getItem('SB_ANON_KEY') || '';
    setIsSupabaseMode(sbUrl.trim() !== '' && sbKey.trim() !== '');
  }

  async function loadSavedClients() {
    const sbUrl = localStorage.getItem('SB_URL') || '';
    const sbKey = localStorage.getItem('SB_ANON_KEY') || '';
    const useSupabase = sbUrl.trim() !== '' && sbKey.trim() !== '';

    if (useSupabase) {
      try {
        const response = await fetch('/api/clients', {
          headers: {
            'x-supabase-url': sbUrl,
            'x-supabase-anon-key': sbKey,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSavedClients(data);
          return;
        }
      } catch (error) {
        console.error('Error cargando de Supabase, usando LocalStorage fallback:', error);
      }
    }

    // Fallback: LocalStorage
    const localData = localStorage.getItem('CRM_CLIENTS');
    if (localData) {
      setSavedClients(JSON.parse(localData));
    } else {
      setSavedClients([]);
    }
  }

  // 2. Operaciones CRUD (Sincronizadas con Supabase o LocalStorage)
  const handleSaveToCRM = async (client: Client) => {
    // Si ya está guardado, no hacer nada
    if (savedClients.some((c) => c.id === client.id)) return;

    const newClient: Client = {
      ...client,
      status: 'nuevo',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseMode) {
      const sbUrl = localStorage.getItem('SB_URL') || '';
      const sbKey = localStorage.getItem('SB_ANON_KEY') || '';
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-supabase-url': sbUrl,
            'x-supabase-anon-key': sbKey,
          },
          body: JSON.stringify(newClient),
        });
        if (response.ok) {
          const saved = await response.json();
          setSavedClients((prev) => [saved, ...prev]);
          alert('Añadido al CRM y guardado en Supabase.');
          return;
        }
      } catch (error) {
        console.error('Fallo al guardar en Supabase:', error);
      }
    }

    // Guardar en LocalStorage
    const updated = [newClient, ...savedClients];
    setSavedClients(updated);
    localStorage.setItem('CRM_CLIENTS', JSON.stringify(updated));
    alert('Añadido al CRM (Almacenamiento Local).');
  };

  const handleUpdateStatus = async (id: string, newStatus: Client['status']) => {
    const updatedList = savedClients.map((c) => 
      c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
    );
    setSavedClients(updatedList);

    if (isSupabaseMode) {
      const sbUrl = localStorage.getItem('SB_URL') || '';
      const sbKey = localStorage.getItem('SB_ANON_KEY') || '';
      try {
        await fetch(`/api/clients/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-supabase-url': sbUrl,
            'x-supabase-anon-key': sbKey,
          },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (error) {
        console.error('Fallo al actualizar en Supabase:', error);
      }
    } else {
      localStorage.setItem('CRM_CLIENTS', JSON.stringify(updatedList));
    }
  };

  const handleSaveNotes = async (id: string, notesText: string) => {
    const updatedList = savedClients.map((c) =>
      c.id === id ? { ...c, notes: notesText, updated_at: new Date().toISOString() } : c
    );
    setSavedClients(updatedList);

    if (isSupabaseMode) {
      const sbUrl = localStorage.getItem('SB_URL') || '';
      const sbKey = localStorage.getItem('SB_ANON_KEY') || '';
      try {
        await fetch(`/api/clients/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-supabase-url': sbUrl,
            'x-supabase-anon-key': sbKey,
          },
          body: JSON.stringify({ notes: notesText }),
        });
      } catch (error) {
        console.error('Fallo al actualizar notas en Supabase:', error);
      }
    } else {
      localStorage.setItem('CRM_CLIENTS', JSON.stringify(updatedList));
    }
  };

  const handleUpdateClientData = (updatedClient: Client) => {
    // 1. Actualizar en la lista del CRM
    const updatedList = savedClients.map((c) =>
      c.id === updatedClient.id ? updatedClient : c
    );
    setSavedClients(updatedList);
    
    // Si no está en Supabase, guardar el nuevo arreglo en localStorage
    if (!isSupabaseMode) {
      localStorage.setItem('CRM_CLIENTS', JSON.stringify(updatedList));
    }

    // 2. Si este cliente está en los resultados de búsqueda activos, actualizar su ficha también
    setSearchResults((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    );

    // 3. Mantener el panel lateral abierto con los nuevos datos
    setSelectedClient(updatedClient);
  };

  const handleUseCurrentLocation = () => {
    getUserLocation(false);
  };

  const runGooglePlacesSearch = (
    lat: number,
    lng: number,
    radius: number,
    types: string[]
  ): Promise<Client[]> => {
    return new Promise((resolve, reject) => {
      const win = window as any;
      if (!win.google || !win.google.maps || !win.google.maps.places) {
        reject(new Error('SDK de Google Maps no está cargado en el cliente.'));
        return;
      }

      try {
        const dummyDiv = document.createElement('div');
        const service = new win.google.maps.places.PlacesService(dummyDiv);
        
        const searchPromises = types.map((t) => {
          return new Promise<any[]>((resType) => {
            let allPlaces: any[] = [];
            const request: any = {
              location: new win.google.maps.LatLng(lat, lng),
              radius: radius,
            };

            if (t === 'hospital') {
              request.type = 'hospital';
            } else if (t === 'clinic') {
              request.keyword = 'clinica';
            } else if (t === 'laboratory') {
              request.keyword = 'laboratorio';
            } else if (t === 'dentist') {
              request.type = 'dentist';
            } else if (t === 'veterinary') {
              request.type = 'veterinary_care';
            }

            const callback = (results: any[], status: any, pagination: any) => {
              if (status === win.google.maps.places.PlacesServiceStatus.OK) {
                allPlaces = [...allPlaces, ...results];
                if (pagination && pagination.hasNextPage) {
                  // Esperar 2 segundos antes de pedir la siguiente página
                  setTimeout(() => {
                    pagination.nextPage();
                  }, 2000);
                } else {
                  resType(allPlaces);
                }
              } else if (status === win.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                resType(allPlaces);
              } else {
                console.warn(`[GooglePlaces] Tipo '${t}' falló con estado:`, status);
                resType(allPlaces); // Retornar lo que se haya recolectado
              }
            };

            service.nearbySearch(request, callback);
          });
        });

        Promise.all(searchPromises)
          .then((resultsArray) => {
            const allPlaces = resultsArray.flat();
            const seenIds = new Set<string>();
            const uniqueClients: Client[] = [];

            allPlaces.forEach((place) => {
              if (!place.place_id || seenIds.has(place.place_id)) return;
              seenIds.add(place.place_id);

              let detectedType = 'clinic';
              if (place.types) {
                if (place.types.includes('hospital')) detectedType = 'hospital';
                else if (place.types.includes('dentist')) detectedType = 'dentist';
                else if (place.types.includes('veterinary_care')) detectedType = 'veterinary';
                else if (place.name?.toLowerCase().includes('laboratorio') || place.name?.toLowerCase().includes('lab')) {
                  detectedType = 'laboratory';
                }
              }

              const address = place.vicinity || place.formatted_address || 'Dirección no registrada';

              uniqueClients.push({
                id: `google-${place.place_id}`,
                name: place.name || 'Establecimiento Médico',
                type: detectedType,
                latitude: place.geometry?.location?.lat() || lat,
                longitude: place.geometry?.location?.lng() || lng,
                address: address,
                status: 'nuevo',
                key_contacts: [],
              });
            });

            resolve(uniqueClients);
          })
          .catch((err) => {
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleToggleSelectClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllClients = () => {
    setSelectedClientIds((prev) => {
      const visibleIds = searchResults.map((c) => c.id);
      const allSelected = visibleIds.every((id) => prev.has(id));
      
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkInvestigate = async () => {
    if (selectedClientIds.size === 0) return;
    
    setIsBulkAnalyzing(true);
    setBulkLogs([]);
    const idsArray = Array.from(selectedClientIds);
    const total = idsArray.length;
    
    setBulkProgress({ current: 0, total, activeName: '' });
    
    const dsKey = localStorage.getItem('DS_API_KEY') || 'sk-f9a0f8949ddd4e15a9445a1813f70942';
    const spKey = localStorage.getItem('SERPER_API_KEY') || '';

    const clientsToAnalyze = idsArray.map(id => {
      return searchResults.find(c => c.id === id) || savedClients.find(c => c.id === id);
    }).filter((c): c is Client => c !== undefined);

    let logsAccumulator: string[] = [];
    const addBulkLog = (text: string) => {
      const time = new Date().toLocaleTimeString();
      logsAccumulator = [...logsAccumulator, `[${time}] ${text}`];
      setBulkLogs(logsAccumulator);
    };

    addBulkLog(`🚀 Iniciando investigación automatizada en lote para ${total} establecimientos...`);

    for (let i = 0; i < clientsToAnalyze.length; i++) {
      const client = clientsToAnalyze[i];
      setBulkProgress({ current: i + 1, total, activeName: client.name });
      
      addBulkLog(`⏳ [${i + 1}/${total}] Investigando "${client.name}"...`);
      
      let crmClient = client;
      if (!savedClients.some((c) => c.id === client.id)) {
        addBulkLog(`📝 Registrando "${client.name}" en CRM...`);
        const newClient: Client = {
          ...client,
          status: 'nuevo',
          created_at: new Date().toISOString(),
        };

        if (isSupabaseMode) {
          const sbUrl = localStorage.getItem('SB_URL') || '';
          const sbKey = localStorage.getItem('SB_ANON_KEY') || '';
          try {
            const response = await fetch('/api/clients', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-supabase-url': sbUrl,
                'x-supabase-anon-key': sbKey,
              },
              body: JSON.stringify(newClient),
            });
            if (response.ok) {
              const saved = await response.json();
              crmClient = saved;
              setSavedClients((prev) => [saved, ...prev]);
            }
          } catch (error) {
            console.error('Fallo al guardar en Supabase:', error);
          }
        } else {
          const updated = [newClient, ...savedClients];
          setSavedClients(updated);
          localStorage.setItem('CRM_CLIENTS', JSON.stringify(updated));
        }
      }

      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client: crmClient,
            keys: {
              deepseekKey: dsKey,
              serperKey: spKey,
            },
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Error en servidor.');
        }

        const data = await response.json();
        
        setSavedClients((prev) => {
          const next = prev.map((c) => (c.id === data.client.id ? data.client : c));
          if (!isSupabaseMode) {
            localStorage.setItem('CRM_CLIENTS', JSON.stringify(next));
          }
          return next;
        });

        setSearchResults((prev) =>
          prev.map((c) => (c.id === data.client.id ? data.client : c))
        );

        addBulkLog(`✅ [${i + 1}/${total}] "${client.name}" investigado con éxito.`);
      } catch (error: any) {
        addBulkLog(`❌ [${i + 1}/${total}] Error investigando "${client.name}": ${error.message}`);
      }

      if (i < clientsToAnalyze.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    addBulkLog(`🎉 Proceso en lote finalizado.`);
    setSelectedClientIds(new Set());
  };

  // 3. Ejecutar la búsqueda geográfica (Google Places con fallback a OSM Overpass)
  const handleGeographicSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingSearch(true);
    setActiveSearchEngine('');
    setSelectedClientIds(new Set());

    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    const radius = parseInt(radiusInput);

    // Intentar primero Google Places en el cliente si está disponible
    const win = window as any;
    if (win.google && win.google.maps && win.google.maps.places) {
      console.log('[Dashboard] Intentando búsqueda nativa con Google Places (Cliente)...');
      try {
        const data = await runGooglePlacesSearch(lat, lon, radius, selectedTypes);
        
        const mergedResults = data.map((gClient) => {
          const saved = savedClients.find((sc) => sc.name.toLowerCase() === gClient.name.toLowerCase() || sc.id === gClient.id);
          if (saved) {
            return saved;
          }
          return gClient;
        });

        setSearchResults(mergedResults);
        setActiveSearchEngine('Google Places (Cliente)');
        setIsLoadingSearch(false);
        return;
      } catch (googleError: any) {
        console.warn('[Dashboard] Google Places falló en cliente, recurriendo a Overpass API:', googleError.message);
      }
    }

    // Fallback a OpenStreetMap / Overpass API (Servidor)
    console.log('[Dashboard] Ejecutando búsqueda de respaldo con OpenStreetMap (Servidor)...');
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          radius: radius,
          types: selectedTypes,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al ejecutar la búsqueda de respaldo.');
      }

      const data: Client[] = await response.json();
      
      const mergedResults = data.map((osmClient) => {
        const saved = savedClients.find((sc) => sc.name.toLowerCase() === osmClient.name.toLowerCase() || sc.id === osmClient.id);
        if (saved) {
          return saved;
        }
        return osmClient;
      });

      setSearchResults(mergedResults);
      setActiveSearchEngine('OpenStreetMap (Respaldo)');
    } catch (error) {
      const err = error as Error;
      alert(`Error en la búsqueda: ${err.message}`);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleToggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleInvestigateClient = (client: Client) => {
    // Si el cliente no está en el CRM, lo registramos automáticamente para poder tener un ID estable
    if (!savedClients.some((c) => c.id === client.id)) {
      handleSaveToCRM(client);
    }
    setSelectedClient(client);
  };

  // 4. Estadísticas del Sidebar
  const stats = React.useMemo(() => {
    const totalCRM = savedClients.length;
    const enriched = savedClients.filter((c) => c.waste_volume !== undefined).length;
    const closed = savedClients.filter((c) => c.status === 'ganado').length;
    return { totalCRM, enriched, closed };
  }, [savedClients]);

  // ID de los clientes guardados para desactivar botón "+" en tabla
  const savedIdsSet = React.useMemo(() => new Set(savedClients.map((c) => c.id)), [savedClients]);

  // Lista unificada para mostrar en el mapa (resultados de búsqueda + clientes guardados)
  const mapClients = React.useMemo(() => {
    const list = [...searchResults];
    savedClients.forEach((sc) => {
      if (!list.some((c) => c.id === sc.id)) {
        list.push(sc);
      }
    });
    return list;
  }, [searchResults, savedClients]);

  return (
    <div className={styles.dashboardLayout}>
      
      {/* Sidebar de navegación */}
      <div className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandLogo}>☣️</span>
          <span className={styles.brandName}>EcoWaste</span>
        </div>

        <div className={styles.nav}>
          <button
            className={`${styles.navItem} ${activeTab === 'buscador' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('buscador')}
          >
            🔍 Buscar Clientes
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'tabla' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('tabla')}
          >
            📋 Resultados ({searchResults.length})
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'crm' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            🗂️ CRM Kanban
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'configuracion' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('configuracion')}
          >
            ⚙️ Configuración
          </button>
        </div>

        {/* Panel de Estadísticas */}
        <div className={styles.statsCard}>
          <div className={styles.statsTitle}>Estadísticas CRM</div>
          <div className={styles.statsList}>
            <div className={styles.statItem}>
              <span>Prospectos:</span>
              <span className={styles.statVal}>{stats.totalCRM}</span>
            </div>
            <div className={styles.statItem}>
              <span>Calificados IA:</span>
              <span className={styles.statVal} style={{ color: 'var(--color-primary)' }}>{stats.enriched}</span>
            </div>
            <div className={styles.statItem}>
              <span>Contratos:</span>
              <span className={styles.statVal} style={{ color: 'var(--color-warning)' }}>{stats.closed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal de Trabajo */}
      <div className={styles.workspace}>
        {activeTab === 'buscador' && (
          <div className={styles.searchTab}>
            
            {/* Cabecera del buscador */}
            <form onSubmit={handleGeographicSearch} className={styles.searchHeader}>
              <div className={styles.searchControls}>
                <div className={styles.inputField}>
                  <label>Latitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputField}>
                  <label>Longitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lonInput}
                    onChange={(e) => setLonInput(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputField}>
                  <label>Radio (Meters)</label>
                  <input
                    type="number"
                    step="100"
                    min="500"
                    max="50000"
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className={styles.btnLocation}
                  disabled={isLocating || isLoadingSearch}
                  title="Usar ubicación actual de mi computadora"
                >
                  {isLocating ? '📍 Obteniendo...' : '📍 Mi Ubicación'}
                </button>

                <button
                  type="submit"
                  className={`${styles.btnSearch} ${isLoadingSearch ? 'animate-radar' : ''}`}
                  disabled={isLoadingSearch || isLocating}
                >
                  {isLoadingSearch ? '📡 Rastreando...' : '📡 Buscar Cercanos'}
                </button>
              </div>

              {/* Filtros de Tipos Checkboxes */}
              <div className={styles.checkboxesGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('hospital')}
                    onChange={() => handleToggleType('hospital')}
                  />
                  🏥 Hospitales / Clínicas
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('clinic')}
                    onChange={() => handleToggleType('clinic')}
                  />
                  ⚕️ Centros Médicos
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('laboratory')}
                    onChange={() => handleToggleType('laboratory')}
                  />
                  🧪 Laboratorios Clínicos
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('dentist')}
                    onChange={() => handleToggleType('dentist')}
                  />
                  🦷 Dentistas
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes('veterinary')}
                    onChange={() => handleToggleType('veterinary')}
                  />
                  🐾 Veterinarias
                </label>
              </div>
            </form>

            {activeSearchEngine && (
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.2rem',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '-0.5rem',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
              }}>
                <span>Motor de búsqueda activo:</span>
                <span style={{
                  color: activeSearchEngine.includes('Google') ? '#10b981' : '#f59e0b',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {activeSearchEngine.includes('Google') ? '🟢' : '🟡'} {activeSearchEngine}
                </span>
              </div>
            )}

            {/* Split Content: Mapa + Quick list or Toggled View on Mobile */}
            {isMobile && (
              <div className={styles.mobileViewToggle}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${searchViewMode === 'mapa' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setSearchViewMode('mapa')}
                >
                  🗺️ Mapa
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${searchViewMode === 'lista' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setSearchViewMode('lista')}
                >
                  📋 Lista ({searchResults.length})
                </button>
              </div>
            )}

            <div className={styles.searchContent} data-view={isMobile ? searchViewMode : 'split'}>
              {(!isMobile || searchViewMode === 'mapa') && (
                <MapView
                  clients={mapClients}
                  onSelectClient={handleInvestigateClient}
                  origin={{ latitude: parseFloat(latInput), longitude: parseFloat(lonInput) }}
                  onOriginChange={(lat, lon) => {
                    setLatInput(lat.toFixed(4));
                    setLonInput(lon.toFixed(4));
                  }}
                  searchRadius={parseInt(radiusInput)}
                  savedIds={savedIdsSet}
                />
              )}
              
              {(!isMobile || searchViewMode === 'lista') && (
                <LeadTable
                  clients={searchResults}
                  onSelectClient={handleSelectClient}
                  onInvestigateClient={handleInvestigateClient}
                  onSaveToCRM={handleSaveToCRM}
                  savedIds={savedIdsSet}
                  selectedIds={selectedClientIds}
                  onToggleSelect={handleToggleSelectClient}
                  onToggleSelectAll={handleToggleSelectAllClients}
                  onBulkInvestigate={handleBulkInvestigate}
                />
              )}
            </div>

          </div>
        )}

        {activeTab === 'tabla' && (
          <LeadTable
            clients={searchResults.length > 0 ? searchResults : savedClients}
            onSelectClient={handleSelectClient}
            onInvestigateClient={handleInvestigateClient}
            onSaveToCRM={handleSaveToCRM}
            savedIds={savedIdsSet}
            selectedIds={selectedClientIds}
            onToggleSelect={handleToggleSelectClient}
            onToggleSelectAll={handleToggleSelectAllClients}
            onBulkInvestigate={handleBulkInvestigate}
          />
        )}

        {activeTab === 'crm' && (
          <CRMBoard
            clients={savedClients}
            onUpdateClientStatus={handleUpdateStatus}
            onSelectClient={handleSelectClient}
          />
        )}

        {activeTab === 'configuracion' && (
          <SettingsPanel
            onSettingsChange={() => {
              loadDatabaseMode();
              loadSavedClients();
            }}
          />
        )}
      </div>

      {/* Barra de navegación inferior para móviles */}
      <nav className={styles.bottomNav}>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'buscador' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('buscador')}
        >
          <span className={styles.bottomNavIcon}>🔍</span>
          <span className={styles.bottomNavLink}>Buscar</span>
        </button>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'tabla' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('tabla')}
        >
          <span className={styles.bottomNavIcon}>📋</span>
          <span className={styles.bottomNavLink}>Leads</span>
        </button>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'crm' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('crm')}
        >
          <span className={styles.bottomNavIcon}>🗂️</span>
          <span className={styles.bottomNavLink}>CRM</span>
        </button>
        <button
          className={`${styles.bottomNavItem} ${activeTab === 'configuracion' ? styles.bottomNavItemActive : ''}`}
          onClick={() => setActiveTab('configuracion')}
        >
          <span className={styles.bottomNavIcon}>⚙️</span>
          <span className={styles.bottomNavLink}>Ajustes</span>
        </button>
      </nav>

      {/* Ficha Lateral de Investigación (Sliding Side Drawer) */}
      {selectedClient && (
        <ResearchPanel
          key={selectedClient.id}
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdateClient={handleUpdateClientData}
          onSaveNotes={handleSaveNotes}
        />
      )}

      {/* Panel de Progreso en Lote */}
      {isBulkAnalyzing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            padding: '30px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🤖</span> Investigación en Lote DeepSeek V4
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Analizando establecimientos y extrayendo volumen de residuos y contactos...
              </p>
            </div>

            {/* Progreso */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '600' }}>
                <span style={{ color: 'var(--color-primary-hover)' }}>
                  {bulkProgress.current === bulkProgress.total && bulkProgress.total > 0
                    ? 'Completado'
                    : `Procesando: ${bulkProgress.activeName || 'Iniciando...'}`}
                </span>
                <span style={{ color: '#ffffff' }}>
                  {bulkProgress.current} de {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100) || 0}%)
                </span>
              </div>
              
              {/* Barra de progreso */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                height: '10px',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                  height: '100%',
                  width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
                }} />
              </div>
            </div>

            {/* Consola Terminal */}
            <div style={{
              background: '#090d16',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#10b981',
              height: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
            }}>
              {bulkLogs.map((log, idx) => (
                <div key={idx} style={{ lineHeight: '1.4', wordBreak: 'break-all' }}>
                  {log}
                </div>
              ))}
              {bulkProgress.current < bulkProgress.total && (
                <div style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Procesando</span>
                  <span style={{ animation: 'map-pulse 1.5s infinite' }}>...</span>
                </div>
              )}
            </div>

            {/* Botón de cierre */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                disabled={bulkProgress.current < bulkProgress.total}
                onClick={() => setIsBulkAnalyzing(false)}
                style={{
                  background: bulkProgress.current === bulkProgress.total ? 'var(--color-primary)' : '#1e293b',
                  color: bulkProgress.current === bulkProgress.total ? '#000000' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: bulkProgress.current === bulkProgress.total ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                  boxShadow: bulkProgress.current === bulkProgress.total ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                }}
              >
                {bulkProgress.current === bulkProgress.total ? 'Cerrar Panel' : 'Procesando lote...'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
