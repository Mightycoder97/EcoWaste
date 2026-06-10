import { NextResponse } from 'next/server';
import { ClientController } from '@/controllers/ClientController';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

// Helper to return 503 if Supabase is not configured
function checkConfig() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase no está configurado. Operando en modo local.', code: 'SUPABASE_UNCONFIGURED' },
      { status: 503 }
    );
  }
  return null;
}

export async function GET() {
  const configError = checkConfig();
  if (configError) return configError;

  try {
    const clients = await ClientController.listClients();
    return NextResponse.json(clients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const configError = checkConfig();
  if (configError) return configError;

  try {
    const body = await request.json();
    const newClient = await ClientController.createClient(body);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
