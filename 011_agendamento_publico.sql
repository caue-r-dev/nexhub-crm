-- ============================================================
-- FASE: agendamento público pelo paciente (self-service booking)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- TENANTS: link público + notificação + regras de slot/sinal
alter table tenants add column slug text unique;
alter table tenants add column notification_phone text;
alter table tenants add column slot_duration_minutes integer not null default 30;
alter table tenants add column buffer_minutes integer not null default 0;
alter table tenants add column booking_hold_minutes integer not null default 120;

-- PROFESSIONAL_HOURS: horário de trabalho individual por profissional/dia da semana
create table professional_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint professional_hours_valid_range check (start_time < end_time)
);

create index idx_professional_hours_professional on professional_hours(professional_id);

alter table professional_hours enable row level security;
create policy "professional_hours isolation - all" on professional_hours
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- PROCEDURE_TYPES: lista de procedimentos que o paciente escolhe no link público
create table procedure_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_procedure_types_tenant on procedure_types(tenant_id);

alter table procedure_types enable row level security;
create policy "procedure_types isolation - all" on procedure_types
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- APPOINTMENTS: origem do agendamento + expiração de reserva não paga
alter table appointments add column source text not null default 'internal';
alter table appointments add column booking_expires_at timestamptz;
