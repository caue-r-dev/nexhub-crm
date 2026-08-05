-- ============================================================
-- NexHub CRM — Fase 2: Módulo Dentista
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- ODONTOGRAMA — um registro por dente por paciente, atualizado in-place
-- ============================================================
create type odontogram_status as enum (
  'saudavel', 'cariado', 'restaurado', 'ausente', 'implante', 'canal', 'extracao_indicada'
);

create table odontogram_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  tooth_number text not null, -- notação FDI (ex: '11', '48') — texto pra caber dentes decíduos (ex: '55')
  status odontogram_status not null default 'saudavel',
  updated_at timestamptz not null default now(),
  unique (client_id, tooth_number)
);

create index idx_odontogram_client on odontogram_records(client_id);

-- ============================================================
-- ANAMNESE — questionário único por paciente, editável
-- ============================================================
create table anamnesis (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade unique,
  questionnaire jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ORÇAMENTOS — itens de tratamento propostos, com total e aprovação
-- ============================================================
create table treatment_budgets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  items jsonb not null default '[]', -- [{ description, quantity, unit_price }]
  total numeric(10,2) not null default 0,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_treatment_budgets_client on treatment_budgets(client_id);

-- ============================================================
-- TRATAMENTOS — procedimentos em andamento, podem vir de um orçamento aprovado
-- ============================================================
create type treatment_status as enum ('planejado', 'em_andamento', 'concluido', 'cancelado');

create table treatments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  procedure text not null,
  status treatment_status not null default 'planejado',
  budget_id uuid references treatment_budgets(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_treatments_client on treatments(client_id);

-- ============================================================
-- EVOLUÇÕES — anotações de acompanhamento, opcionalmente ligadas a uma consulta
-- ============================================================
create table evolutions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index idx_evolutions_client on evolutions(client_id);

-- ============================================================
-- ROW LEVEL SECURITY — isolamento total por tenant, mesmo padrão da 001
-- ============================================================
alter table odontogram_records enable row level security;
alter table anamnesis enable row level security;
alter table treatment_budgets enable row level security;
alter table treatments enable row level security;
alter table evolutions enable row level security;

create policy "odontogram isolation - all" on odontogram_records
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "anamnesis isolation - all" on anamnesis
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "treatment_budgets isolation - all" on treatment_budgets
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "treatments isolation - all" on treatments
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create policy "evolutions isolation - all" on evolutions
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
