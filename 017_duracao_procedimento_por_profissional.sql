-- ============================================================
-- FASE: duracao do procedimento personalizada por profissional
-- (cada dentista pode levar um tempo diferente no mesmo procedimento)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table professional_procedure_durations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  procedure_type_id uuid not null references procedure_types(id) on delete cascade,
  duration_min integer not null,
  created_at timestamptz not null default now(),
  unique (professional_id, procedure_type_id)
);

create index idx_ppd_professional on professional_procedure_durations(professional_id);

alter table professional_procedure_durations enable row level security;
create policy "professional_procedure_durations isolation - all" on professional_procedure_durations
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
