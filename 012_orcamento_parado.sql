-- ============================================================
-- FASE: recuperação automática de orçamento parado
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table treatment_budgets add column declined_at timestamptz;
alter table treatment_budgets add column followup_day3_sent_at timestamptz;
alter table treatment_budgets add column followup_day7_sent_at timestamptz;

alter table tenants add column budget_followup_message_day3 text;
alter table tenants add column budget_followup_message_day7 text;
