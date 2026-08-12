-- ============================================================
-- FASE: título/ocultação por card de mensagem + contato recorrente
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table message_templates add column label text;
alter table message_templates add column hidden boolean not null default false;
