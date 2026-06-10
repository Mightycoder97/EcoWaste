import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { ResearchLog } from './db';

export class ResearchModel {
  private static checkConfiguration() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado en el servidor.');
    }
  }

  static async getByClientId(clientId: string): Promise<ResearchLog[]> {
    this.checkConfiguration();
    const { data, error } = await supabase!
      .from('research_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener logs de investigación: ${error.message}`);
    }

    return data || [];
  }

  static async create(log: Omit<ResearchLog, 'id' | 'created_at'>): Promise<ResearchLog> {
    this.checkConfiguration();
    const { data, error } = await supabase!
      .from('research_logs')
      .insert([log])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear log de investigación: ${error.message}`);
    }

    return data;
  }
}
