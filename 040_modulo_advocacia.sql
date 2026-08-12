-- ============================================================
-- FASE: módulo advocacia (processos, prazos, honorário estruturado)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table processos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  numero_cnj text,
  vara_comarca text,
  tipo_acao text,
  area_direito text,
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);

create index idx_processos_client on processos(client_id);
create index idx_processos_tenant on processos(tenant_id);

alter table processos enable row level security;
create policy "processos isolation" on processos
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create table prazos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  processo_id uuid not null references processos(id) on delete cascade,
  tipo_prazo text not null,
  data_fatal date not null,
  status text not null default 'pendente' check (status in ('pendente', 'cumprido')),
  alerta_dias_antes integer not null default 5,
  alerta_enviado_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_prazos_processo on prazos(processo_id);
create index idx_prazos_pendentes on prazos(data_fatal) where status = 'pendente';

alter table prazos enable row level security;
create policy "prazos isolation" on prazos
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- Audiência/reunião vinculada a processo — reaproveita appointments existente,
-- não cria agenda própria. Nullable pra não quebrar tenant de outro nicho.
alter table appointments add column processo_id uuid references processos(id) on delete set null;

-- Honorário estruturado — reaproveita treatment_budgets (já é "orçamento"
-- genérico), campos nullable pra não afetar outros nichos.
alter table treatment_budgets add column fee_type text check (fee_type in ('fixo', 'exito', 'misto'));
alter table treatment_budgets add column success_fee_percent numeric(5,2);
alter table treatment_budgets add column case_value numeric(12,2);
