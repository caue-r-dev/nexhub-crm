-- ============================================================
-- FASE: módulo veterinário (ficha do animal, vacina, internação)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table animals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  species text,
  breed text,
  weight numeric(6,2),
  birth_date date,
  hospitalized boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_animals_client on animals(client_id);
create index idx_animals_tenant on animals(tenant_id);

alter table animals enable row level security;
create policy "animals isolation" on animals
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create table animal_vaccines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  animal_id uuid not null references animals(id) on delete cascade,
  vaccine_name text not null,
  applied_at date not null,
  professional text,
  next_dose_at date,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_animal_vaccines_animal on animal_vaccines(animal_id);
create index idx_animal_vaccines_next_dose on animal_vaccines(next_dose_at) where next_dose_at is not null and reminder_sent_at is null;

alter table animal_vaccines enable row level security;
create policy "animal_vaccines isolation" on animal_vaccines
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create table animal_hospitalizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  animal_id uuid not null references animals(id) on delete cascade,
  reason text,
  admitted_at timestamptz not null default now(),
  discharged_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_animal_hospitalizations_animal on animal_hospitalizations(animal_id);

alter table animal_hospitalizations enable row level security;
create policy "animal_hospitalizations isolation" on animal_hospitalizations
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

create table animal_hospitalization_notes (
  id uuid primary key default gen_random_uuid(),
  hospitalization_id uuid not null references animal_hospitalizations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index idx_animal_hosp_notes_hosp on animal_hospitalization_notes(hospitalization_id);

alter table animal_hospitalization_notes enable row level security;
create policy "animal_hospitalization_notes isolation" on animal_hospitalization_notes
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
