-- ============================================================
-- FASE: trava contra loop de conflito de socket no reconnect do WhatsApp
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table tenants add column whatsapp_qr_requested_at timestamptz;
