'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SettingsPanel from './SettingsPanel';
import LeadTable from './LeadTable';
import CRMBoard from './CRMBoard';
import ResearchPanel from './ResearchPanel';
import { Client } from '@/models/db';
import { 
  Search, 
  Table, 
  LayoutDashboard, 
  Settings, 
  MapPin, 
  Loader2, 
  Database, 
  AlertCircle, 
  Activity,
  CheckCircle,
  X,
  Map,
  List
} from 'lucide-react';

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
  const [googleMapsAlert, setGoogleMapsAlert] = useState<string | null>(null);

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
          alert('Añadido al CRM.');
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

  const handleToggleSelectAllClients = (visibleIds?: string[]) => {
    setSelectedClientIds((prev) => {
      const ids = visibleIds || searchResults.map((c) => c.id);
      const allSelected = ids.every((id) => prev.has(id));
      
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
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
    
    const geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
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

    addBulkLog(`Iniciando investigación automática en lote para ${total} establecimientos...`);

    for (let i = 0; i < clientsToAnalyze.length; i++) {
      const client = clientsToAnalyze[i];
      setBulkProgress({ current: i + 1, total, activeName: client.name });
      
      addBulkLog(`[${i + 1}/${total}] Analizando "${client.name}"...`);
      
      let crmClient = client;
      if (!savedClients.some((c) => c.id === client.id)) {
        addBulkLog(`Registrando "${client.name}" en CRM...`);
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
              geminiKey,
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

        addBulkLog(`✓ [${i + 1}/${total}] "${client.name}" calificado con éxito.`);
      } catch (error: any) {
        addBulkLog(`✗ [${i + 1}/${total}] Error analizando "${client.name}": ${error.message}`);
      }

      if (i < clientsToAnalyze.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    addBulkLog(`Proceso de análisis finalizado.`);
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
        setGoogleMapsAlert(null);
        return;
      } catch (googleError: any) {
        console.warn('[Dashboard] Google Places falló en cliente, recurriendo a Overpass API:', googleError.message);
        setGoogleMapsAlert(`Google Places en el cliente falló: ${googleError.message}`);
      }
    }

    // Fallback a OpenStreetMap / Overpass API (Servidor)
    console.log('[Dashboard] Búsqueda con OpenStreetMap...');
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
        throw new Error('Error al ejecutar la búsqueda.');
      }

      const resJson = await response.json();
      const data: Client[] = Array.isArray(resJson) ? resJson : resJson.clients;
      const googleAlert = Array.isArray(resJson) ? null : resJson.googleAlert;

      if (googleAlert) {
        setGoogleMapsAlert(`Google Places en el servidor falló: ${googleAlert}`);
      } else if (!googleMapsAlert && !Array.isArray(resJson)) {
        setGoogleMapsAlert(null);
      }
      
      const mergedResults = data.map((osmClient) => {
        const saved = savedClients.find((sc) => sc.name.toLowerCase() === osmClient.name.toLowerCase() || sc.id === osmClient.id);
        if (saved) {
          return saved;
        }
        return osmClient;
      });

      setSearchResults(mergedResults);
      setActiveSearchEngine(googleAlert ? 'OpenStreetMap (Respaldo)' : 'Google Places (Servidor)');
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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-16 md:pb-0 select-none">
      
      {/* Sidebar de navegación */}
      <div className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6 gap-6 shrink-0 justify-between">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2.5 py-1 border-b border-border/40">
            <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center text-background text-sm font-bold">
              E
            </div>
            <span className="font-sans font-bold text-base tracking-tight text-foreground">EcoWaste</span>
          </div>

          <div className="flex flex-col gap-1">
            <button
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'buscador' 
                  ? 'bg-secondary text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              onClick={() => setActiveTab('buscador')}
            >
              <Search className="w-4 h-4" />
              <span>Buscar Clientes</span>
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'tabla' 
                  ? 'bg-secondary text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              onClick={() => setActiveTab('tabla')}
            >
              <Table className="w-4 h-4" />
              <span className="flex-1 text-left">Resultados</span>
              {searchResults.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                  {searchResults.length}
                </span>
              )}
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'crm' 
                  ? 'bg-secondary text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              onClick={() => setActiveTab('crm')}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Tablero CRM</span>
            </button>
            <button
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'configuracion' 
                  ? 'bg-secondary text-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
              onClick={() => setActiveTab('configuracion')}
            >
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </button>
          </div>
        </div>

        {/* Panel de Estadísticas */}
        <div className="border border-border rounded-lg p-4 bg-muted/20 flex flex-col gap-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Estadísticas CRM
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Prospectos:</span>
              <span className="font-mono text-foreground font-medium">{stats.totalCRM}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Calificados:</span>
              <span className="font-mono text-foreground font-medium">{stats.enriched}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cerrados:</span>
              <span className="font-mono text-foreground font-medium">{stats.closed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal de Trabajo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {activeTab === 'buscador' && (
          <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
            
            {/* Cabecera del buscador */}
            <form onSubmit={handleGeographicSearch} className="bg-card border border-border rounded-lg p-5 flex flex-col gap-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Latitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Longitud</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={lonInput}
                    onChange={(e) => setLonInput(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Radio (metros)</label>
                  <input
                    type="number"
                    step="100"
                    min="500"
                    max="50000"
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="h-9 border border-border hover:bg-muted text-xs font-medium px-4 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  disabled={isLocating || isLoadingSearch}
                  title="Usar ubicación de mi navegador"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Obteniendo...' : 'Mi ubicación'}</span>
                </button>

                <button
                  type="submit"
                  className="h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium px-4 rounded-md flex items-center justify-center gap-2 cursor-pointer shadow transition-colors disabled:opacity-50"
                  disabled={isLoadingSearch || isLocating}
                >
                  {isLoadingSearch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <span>Buscar cercanos</span>
                  )}
                </button>
              </div>

              {/* Filtros de Tipos Checkboxes */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-3 border-t border-border/40">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-ring"
                    checked={selectedTypes.includes('hospital')}
                    onChange={() => handleToggleType('hospital')}
                  />
                  <span>Hospitales y Clínicas</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-ring"
                    checked={selectedTypes.includes('clinic')}
                    onChange={() => handleToggleType('clinic')}
                  />
                  <span>Centros Médicos</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-ring"
                    checked={selectedTypes.includes('laboratory')}
                    onChange={() => handleToggleType('laboratory')}
                  />
                  <span>Laboratorios Clínicos</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-ring"
                    checked={selectedTypes.includes('dentist')}
                    onChange={() => handleToggleType('dentist')}
                  />
                  <span>Consultas Dentales</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-ring"
                    checked={selectedTypes.includes('veterinary')}
                    onChange={() => handleToggleType('veterinary')}
                  />
                  <span>Centros Veterinarios</span>
                </label>
              </div>
            </form>

            {activeSearchEngine && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 px-1 -mt-2">
                <span>Servicio de datos activo:</span>
                <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  {activeSearchEngine}
                </span>
              </div>
            )}

            {googleMapsAlert && (
              <div className="flex items-start justify-between gap-3 bg-red-950/20 border border-red-900/40 text-red-200 p-4 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <strong>Alerta de servicio:</strong> {googleMapsAlert}
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setGoogleMapsAlert(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Split Content: Mapa + Lead Table */}
            {isMobile && (
              <div className="flex w-full border border-border rounded-md overflow-hidden bg-card">
                <button
                  type="button"
                  className={`flex-1 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    searchViewMode === 'mapa' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground bg-transparent'
                  }`}
                  onClick={() => setSearchViewMode('mapa')}
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Mapa</span>
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    searchViewMode === 'lista' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground bg-transparent'
                  }`}
                  onClick={() => setSearchViewMode('lista')}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Resultados ({searchResults.length})</span>
                </button>
              </div>
            )}

            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
              {(!isMobile || searchViewMode === 'mapa') && (
                <div className={`${isMobile ? 'h-[400px]' : 'lg:col-span-6 xl:col-span-7 h-[580px]'} flex flex-col`}>
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
                </div>
              )}
              
              {(!isMobile || searchViewMode === 'lista') && (
                <div className={`${isMobile ? '' : 'lg:col-span-6 xl:col-span-5 h-[580px] overflow-y-auto'} flex flex-col`}>
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
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'tabla' && (
          <div className="p-6 max-w-7xl mx-auto w-full">
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
          </div>
        )}

        {activeTab === 'crm' && (
          <div className="p-6 flex-1 flex flex-col min-h-0">
            <CRMBoard
              clients={savedClients}
              onUpdateClientStatus={handleUpdateStatus}
              onSelectClient={handleSelectClient}
            />
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="p-6 max-w-3xl mx-auto w-full">
            <SettingsPanel
              onSettingsChange={() => {
                loadDatabaseMode();
                loadSavedClients();
              }}
            />
          </div>
        )}
      </div>

      {/* Barra de navegación inferior para móviles */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex justify-around items-center z-50 px-2">
        <button
          className={`flex flex-col items-center justify-center gap-1.5 w-1/4 h-full cursor-pointer transition-colors ${
            activeTab === 'buscador' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('buscador')}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px]">Buscar</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center gap-1.5 w-1/4 h-full cursor-pointer transition-colors ${
            activeTab === 'tabla' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('tabla')}
        >
          <Table className="w-4 h-4" />
          <span className="text-[10px]">Leads</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center gap-1.5 w-1/4 h-full cursor-pointer transition-colors ${
            activeTab === 'crm' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('crm')}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px]">CRM</span>
        </button>
        <button
          className={`flex flex-col items-center justify-center gap-1.5 w-1/4 h-full cursor-pointer transition-colors ${
            activeTab === 'configuracion' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('configuracion')}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px]">Ajustes</span>
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-lg">
            <div>
              <h3 className="font-semibold text-base text-foreground mb-1.5 flex items-center gap-2">
                <Activity className="w-4 h-4 animate-pulse text-muted-foreground" />
                <span>Análisis automático en lote</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Recopilando datos de establecimientos y estructurando estimaciones de volumen...
              </p>
            </div>

            {/* Progreso */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[70%]">
                  {bulkProgress.current === bulkProgress.total && bulkProgress.total > 0
                    ? 'Completado'
                    : `Establecimiento: ${bulkProgress.activeName || 'Iniciando...'}`}
                </span>
                <span className="font-semibold font-mono">
                  {bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100) || 0}%)
                </span>
              </div>
              
              {/* Barra de progreso */}
              <div className="bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
                <div 
                  className="bg-foreground h-full transition-all duration-300"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                />
              </div>
            </div>

            {/* Consola Terminal */}
            <div className="bg-background border border-border rounded-md p-4 font-mono text-[11px] text-muted-foreground h-44 overflow-y-auto flex flex-col gap-1">
              {bulkLogs.map((log, idx) => (
                <div key={idx} className="line-height-1.4 word-break-break-all">
                  {log}
                </div>
              ))}
              {bulkProgress.current < bulkProgress.total && (
                <div className="text-foreground animate-pulse">
                  Procesando...
                </div>
              )}
            </div>

            {/* Botón de cierre */}
            <div className="flex justify-end pt-1">
              <button
                disabled={bulkProgress.current < bulkProgress.total}
                onClick={() => setIsBulkAnalyzing(false)}
                className={`h-9 px-4 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  bulkProgress.current === bulkProgress.total 
                    ? 'bg-foreground text-background hover:bg-foreground/90' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                }`}
              >
                {bulkProgress.current === bulkProgress.total ? 'Cerrar panel' : 'Procesando...'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
