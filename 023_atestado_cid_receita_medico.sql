-- ============================================================
-- FASE: atestado no formato clinico padrao (RG, horario, CID,
-- convalescenca) + receita exigindo profissional responsavel +
-- especialidade do profissional pro cabecalho do documento
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table clinical_documents add column cid text;
alter table clinical_documents add column exam_date date;
alter table clinical_documents add column start_time text;
alter table clinical_documents add column end_time text;
alter table clinical_documents add column convalescence boolean;
alter table clinical_documents add column convalescence_period text;

alter table professionals add column role text;
