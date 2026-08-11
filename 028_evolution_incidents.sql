create table evolution_incidents (
  id uuid primary key default gen_random_uuid(),
  instance_name text not null,
  error_message text not null,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index evolution_incidents_unresolved_idx on evolution_incidents (instance_name) where resolved_at is null;

alter table tenants add column last_whatsapp_state text;
