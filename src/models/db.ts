export interface KeyContact {
  name: string;
  role: string;
  phone?: string;
  email?: string;
}

export interface Client {
  id: string;
  name: string;
  type: string; // 'hospital' | 'clinic' | 'laboratory' | 'dentist' | 'veterinary'
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'nuevo' | 'contactado' | 'negociacion' | 'ganado' | 'descartado';
  waste_volume?: string; // 'alto' | 'medio' | 'bajo'
  waste_details?: string;
  key_contacts?: KeyContact[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResearchLog {
  id: string;
  client_id: string;
  search_queries: string[];
  raw_search_results: { title: string; link: string; snippet: string }[];
  deepseek_response: string;
  created_at?: string;
}
