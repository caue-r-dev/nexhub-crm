-- ============================================================
-- FASE: controle de estoque com validade de produtos
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  quantity numeric(10,2) not null default 0,
  unit text not null default 'un',
  min_quantity numeric(10,2),
  expires_at date,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_inventory_items_tenant on inventory_items(tenant_id);

alter table inventory_items enable row level security;
create policy "inventory_items isolation - all" on inventory_items
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());
