-- ============================================================
-- NexHub CRM — Fase 1: Fundação multi-tenant
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================
create type niche_type as enum ('dentista', 'unhas', 'advogado', 'outro');
create type palette_type as enum ('petroleo', 'bege', 'neutro');

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche niche_type not null,
  theme_palette palette_type not null default 'petroleo',
  chatwoot_account_id integer,
  evolution_instance_name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- USERS (vincula auth.users do Supabase a um tenant)
-- ============================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auth_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (auth_id)
);

-- ============================================================
-- CLIENTS (pacientes / clientes / partes, dependendo do nicho)
-- ============================================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  phone text,
  document text,
  birth_date date,
  tags text[] default '{}',
  niche_data jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_clients_tenant on clients(tenant_id);

-- ============================================================
-- APPOINTMENTS (agenda)
-- ============================================================
create type appointment_status as enum ('pending', 'confirmed', 'cancelled', 'done', 'no_show');

create table appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  datetime timestamptz not null,
  duration_min integer not null default 30,
  status appointment_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create index idx_appointments_tenant on appointments(tenant_id);
create index idx_appointments_datetime on appointments(tenant_id, datetime);

-- ============================================================
-- TRANSACTIONS (financeiro)
-- ============================================================
create type transaction_status as enum ('receivable', 'received', 'overdue');

create table transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  amount numeric(10,2) not null,
  status transaction_status not null default 'receivable',
  due_date date,
  created_at timestamptz not null default now()
);

create index idx_transactions_tenant on transactions(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY — isolamento total por tenant
-- ============================================================

alter table tenants enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table transactions enable row level security;

-- Função helper: retorna o tenant_id do usuário autenticado
create or replace function auth_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id from users where auth_id = auth.uid()
$$;

-- TENANTS: usuário só vê o próprio tenant
create policy "tenant isolation - select" on tenants
  for select using (id = auth_tenant_id());

-- USERS: usuário só vê usuários do próprio tenant
create policy "users isolation - select" on users
  for select using (tenant_id = auth_tenant_id());

-- CLIENTS: isolamento total por tenant
create policy "clients isolation - all" on clients
  for all using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- APPOINTMENTS: isolamento total por tenant
create policy "appointments isolation - all" on appointments
  for all using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- TRANSACTIONS: isolamento total por tenant
create policy "transactions isolation - all" on transactions
  for all using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());
