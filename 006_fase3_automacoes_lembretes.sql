-- ============================================================
-- NexHub CRM — Fase 3: Automações de lembrete (n8n)
-- Marca quando cada lembrete já foi enviado, pra não duplicar disparo
-- em execuções repetidas do cron.
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table appointments add column reminder_24h_sent_at timestamptz;
alter table appointments add column reminder_2h_sent_at timestamptz;
