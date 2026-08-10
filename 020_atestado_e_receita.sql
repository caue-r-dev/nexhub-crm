-- ============================================================
-- FASE: gerar atestado e receita medica (documento clinico imprimivel)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table clinical_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  professional_id uuid references professionals(id) on delete set null,
  type text not null check (type in ('atestado', 'receita')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_clinical_documents_client on clinical_documents(client_id);

alter table clinical_documents enable row level security;
create policy "clinical_documents isolation - all" on clinical_documents
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
