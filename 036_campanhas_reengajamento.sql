-- ============================================================
-- FASE: campanhas de reengajamento (disparo em massa por segmentação)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create type campaign_filter_type as enum ('sem_visita', 'orcamento_aberto');
create type campaign_recipient_status as enum ('pending', 'sent', 'failed');

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  filter_type campaign_filter_type not null,
  filter_days integer not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_campaigns_tenant on campaigns(tenant_id);

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  phone text not null,
  message text not null,
  status campaign_recipient_status not null default 'pending',
  sent_at timestamptz,
  responded_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index idx_campaign_recipients_campaign on campaign_recipients(campaign_id);
create index idx_campaign_recipients_pending on campaign_recipients(status) where status = 'pending';
create index idx_campaign_recipients_phone on campaign_recipients(phone);

alter table campaigns enable row level security;
create policy "campaigns isolation" on campaigns
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

alter table campaign_recipients enable row level security;
create policy "campaign_recipients isolation" on campaign_recipients
  for all using (
    campaign_id in (select id from campaigns where tenant_id = auth_tenant_id())
  )
  with check (
    campaign_id in (select id from campaigns where tenant_id = auth_tenant_id())
  );
