-- ============================================================
-- FASE: tempo medio (duracao padrao) por tipo de procedimento
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table procedure_types add column default_duration_min integer;
