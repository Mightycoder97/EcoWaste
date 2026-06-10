import { NextResponse } from 'next/server';
import { ResearchController } from '@/controllers/ResearchController';

export async function POST(request: Request) {
  try {
    const { client, keys } = await request.json();

    if (!client || !client.id || !client.name) {
      return NextResponse.json({ error: 'Se requiere un objeto de cliente válido con ID y Nombre.' }, { status: 400 });
    }

    console.log(`[API Research] Iniciando investigación para: ${client.name} (${client.id})`);
    
    // Ejecutar el controlador de investigación
    const result = await ResearchController.performResearch(client, keys);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Research] Falló la investigación:', error.message);
    return NextResponse.json(
      { error: error.message || 'Error interno durante el análisis.' },
      { status: 500 }
    );
  }
}
