-- ============================================================
-- NexHub CRM — Fase 3: Atendimento WhatsApp embutido (Chatwoot + Evolution)
-- Credenciais por tenant — nunca expostas ao client, só lidas em server
-- actions/route handlers.
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table tenants add column chatwoot_base_url text;
alter table tenants add column chatwoot_api_token text;
alter table tenants add column chatwoot_inbox_id integer;
alter table tenants add column evolution_base_url text;
alter table tenants add column evolution_api_key text;
