import { NextResponse } from 'next/server';
import { ClientController } from '@/controllers/ClientController';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

function checkConfig() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase no está configurado. Operando en modo local.', code: 'SUPABASE_UNCONFIGURED' },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const configError = checkConfig();
  if (configError) return configError;

  try {
    const { id } = await params;
    const client = await ClientController.getClient(id);
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const configError = checkConfig();
  if (configError) return configError;

  try {
    const { id } = await params;
    const body = await request.json();
    const updatedClient = await ClientController.updateClient(id, body);
    return NextResponse.json(updatedClient);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const configError = checkConfig();
  if (configError) return configError;

  try {
    const { id } = await params;
    await ClientController.deleteClient(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
