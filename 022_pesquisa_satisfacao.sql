-- ============================================================
-- FASE: pesquisa de satisfacao com integracao Google Maps/Meu Negocio
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table tenants add column google_review_link text;

create table satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  rating integer check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index idx_satisfaction_surveys_tenant on satisfaction_surveys(tenant_id);
create unique index idx_satisfaction_surveys_appointment on satisfaction_surveys(appointment_id) where appointment_id is not null;

alter table satisfaction_surveys enable row level security;
create policy "satisfaction_surveys isolation - all" on satisfaction_surveys
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
