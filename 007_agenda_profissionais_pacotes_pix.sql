-- ============================================================
-- NexHub CRM — Agenda multi-profissional + Pacotes/Sessões + Pix antecipado
-- Migração 100% aditiva: nenhuma coluna/tabela existente é alterada ou
-- removida. Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- PROFISSIONAIS (A3)
-- ============================================================
create table professionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  color text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_professionals_tenant on professionals(tenant_id);

alter table appointments
  add column professional_id uuid references professionals(id) on delete set null;

-- ============================================================
-- PACOTES / SESSÕES (A5)
-- ============================================================
create table packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  service_name text not null,
  total_sessions integer not null,
  used_sessions integer not null default 0,
  price numeric(10,2),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz
);

create index idx_packages_tenant on packages(tenant_id);
create index idx_packages_client on packages(client_id);

alter table appointments
  add column package_id uuid references packages(id) on delete set null;

-- ============================================================
-- PIX ANTECIPADO (A6) — QR estático (chave + valor), sem gateway/PSP
-- ============================================================
alter table tenants add column pix_key text;
alter table tenants add column pix_receiver_name text;

create type payment_status_type as enum ('nao_solicitado', 'aguardando', 'confirmado');

alter table appointments
  add column payment_status payment_status_type not null default 'nao_solicitado';
alter table appointments add column deposit_amount numeric(10,2);

-- ============================================================
-- ROW LEVEL SECURITY — mesmo padrão de isolamento por tenant_id
-- ============================================================
alter table professionals enable row level security;
alter table packages enable row level security;

create policy "professionals isolation - all" on professionals
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "packages isolation - all" on packages
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
