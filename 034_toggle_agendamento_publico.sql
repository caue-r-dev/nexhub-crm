-- ============================================================
-- FASE: liga/desliga agendamento público por tenant
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table tenants add column public_booking_enabled boolean not null default true;
