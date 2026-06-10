import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Client } from './db';

export class ClientModel {
  private static checkConfiguration() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado en el servidor.');
    }
  }

  static async getAll(): Promise<Client[]> {
    this.checkConfiguration();
    const { data, error } = await supabase!
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error al obtener clientes: ${error.message}`);
    }

    return data || [];
  }

  static async getById(id: string): Promise<Client | null> {
    this.checkConfiguration();
    const { data, error } = await supabase!
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw new Error(`Error al obtener cliente ${id}: ${error.message}`);
    }

    return data;
  }

  static async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    this.checkConfiguration();
    const { data, error } = await supabase!
      .from('clients')
      .insert([client])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al crear cliente: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, client: Partial<Client>): Promise<Client> {
    this.checkConfiguration();
    // Prevent overriding read-only fields
    const { id: _, created_at: __, updated_at: ___, ...updateData } = client as any;

    const { data, error } = await supabase!
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error al actualizar cliente ${id}: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    this.checkConfiguration();
    const { error } = await supabase!
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error al borrar cliente ${id}: ${error.message}`);
    }
  }
}
