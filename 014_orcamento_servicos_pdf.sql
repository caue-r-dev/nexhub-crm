-- ============================================================
-- FASE: catálogo de serviços + dados de documento (PDF de orçamento)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  default_value numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_services_tenant on services(tenant_id);

alter table services enable row level security;
create policy "services isolation - all" on services
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

alter table tenants add column phone text;
alter table tenants add column email text;
alter table tenants add column address text;

alter table professionals add column registration_number text;

alter table treatment_budgets add column professional_id uuid references professionals(id) on delete set null;
