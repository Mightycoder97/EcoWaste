import { ClientModel } from '@/models/ClientModel';
import { Client } from '@/models/db';

const VALID_STATUSES = ['nuevo', 'contactado', 'negociacion', 'ganado', 'descartado'];

export class ClientController {
  static validateClient(client: Partial<Client>) {
    if (client.name && client.name.trim() === '') {
      throw new Error('El nombre del cliente no puede estar vacío.');
    }
    
    if (client.status && !VALID_STATUSES.includes(client.status)) {
      throw new Error(`Estado no válido. Debe ser uno de: ${VALID_STATUSES.join(', ')}`);
    }

    if (client.latitude !== undefined && (client.latitude < -90 || client.latitude > 90)) {
      throw new Error('La latitud debe estar entre -90 y 90 grados.');
    }

    if (client.longitude !== undefined && (client.longitude < -180 || client.longitude > 180)) {
      throw new Error('La longitud debe estar entre -180 y 180 grados.');
    }
  }

  static async listClients(): Promise<Client[]> {
    return await ClientModel.getAll();
  }

  static async getClient(id: string): Promise<Client | null> {
    if (!id) throw new Error('Se requiere un ID de cliente válido.');
    return await ClientModel.getById(id);
  }

  static async createClient(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    this.validateClient(clientData);
    
    // Clean and sanitize text fields
    const sanitized = {
      ...clientData,
      name: clientData.name.trim(),
      address: clientData.address?.trim(),
      phone: clientData.phone?.trim(),
      email: clientData.email?.trim(),
      website: clientData.website?.trim(),
      status: clientData.status || 'nuevo',
    };

    return await ClientModel.create(sanitized);
  }

  static async updateClient(id: string, clientData: Partial<Client>): Promise<Client> {
    if (!id) throw new Error('Se requiere un ID de cliente válido.');
    this.validateClient(clientData);
    
    return await ClientModel.update(id, clientData);
  }

  static async deleteClient(id: string): Promise<void> {
    if (!id) throw new Error('Se requiere un ID de cliente válido.');
    await ClientModel.delete(id);
  }
}
