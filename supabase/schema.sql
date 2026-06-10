-- EcoWaste Finder - Database Schema for Supabase

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create client status types/constraints
-- Valid statuses: 'nuevo', 'contactado', 'negociacion', 'ganado', 'descartado'

-- Create clients table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'hospital', 'clinic', 'laboratory', 'dentist', 'veterinary', etc.
  latitude double precision not null,
  longitude double precision not null,
  address text,
  phone text,
  email text,
  website text,
  status text not null default 'nuevo',
  waste_volume text, -- 'alto', 'medio', 'bajo' or descriptive
  waste_details text, -- e.g., 'biomedical, chemicals, sharps'
  key_contacts jsonb default '[]'::jsonb, -- array of {name, role, phone, email}
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create research_logs table
create table if not exists public.research_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  search_queries jsonb default '[]'::jsonb,
  raw_search_results jsonb default '[]'::jsonb,
  deepseek_response text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_type_idx on public.clients(type);
create index if not exists research_logs_client_id_idx on public.research_logs(client_id);

-- Enable Row Level Security (RLS)
alter table public.clients enable row level security;
alter table public.research_logs enable row level security;

-- Create basic permissive policies for demo/local environment
-- NOTE: For production, restrict these policies using authenticated roles (auth.uid())
create policy "Permitir lectura publica de clientes"
  on public.clients for select
  using (true);

create policy "Permitir insercion publica de clientes"
  on public.clients for insert
  with check (true);

create policy "Permitir actualizacion publica de clientes"
  on public.clients for update
  using (true);

create policy "Permitir borrado publico de clientes"
  on public.clients for delete
  using (true);

create policy "Permitir lectura publica de logs"
  on public.research_logs for select
  using (true);

create policy "Permitir insercion publica de logs"
  on public.research_logs for insert
  with check (true);

create policy "Permitir actualizacion publica de logs"
  on public.research_logs for update
  using (true);

create policy "Permitir borrado publico de logs"
  on public.research_logs for delete
  using (true);

-- Create trigger to automatically update updated_at on clients
create or replace function public.handle_update_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_clients_updated_at
  before update on public.clients
  for each row
  execute function public.handle_update_timestamp();
