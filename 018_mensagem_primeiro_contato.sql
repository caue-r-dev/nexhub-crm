-- ============================================================
-- FASE: mensagem personalizada de primeiro contato com o paciente
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table tenants add column welcome_message text;
