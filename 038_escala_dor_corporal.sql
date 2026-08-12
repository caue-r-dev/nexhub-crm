-- ============================================================
-- FASE: escala de avaliação de dor corporal (fisioterapia)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table pain_points (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  view text not null check (view in ('front', 'back')),
  x numeric(5,2) not null,
  y numeric(5,2) not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index idx_pain_points_client on pain_points(client_id);

alter table pain_points enable row level security;
create policy "pain_points isolation" on pain_points
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- ============================================================
-- FASE: protocolo padrão por tipo de procedimento (estética)
-- ============================================================
alter table procedure_types add column protocol text;
