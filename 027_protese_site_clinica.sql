create table prostheses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  client_id uuid references clients(id) not null,
  type text not null,
  tooth_number text,
  status text not null default 'pedido_enviado_lab',
  sent_to_lab_at date,
  expected_return_at date,
  received_at date,
  delivered_at date,
  notes text,
  created_at timestamptz default now()
);

alter table prostheses enable row level security;

create policy "tenant isolation" on prostheses
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

alter table tenants add column website_url text;
