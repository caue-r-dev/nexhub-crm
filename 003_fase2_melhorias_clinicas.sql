-- ============================================================
-- NexHub CRM — Fase 2: Melhorias clínicas (anamnese completa,
-- orçamentos por dente/parcelas, evoluções com profissional, convênio)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- Convênio do cliente — nome do plano ou null/vazio = particular.
-- Usado pra saber que o atendimento gera guia a entregar pro convênio.
alter table clients add column convenio text;

-- Orçamento: entrada, parcelas e desconto — antes só existia o total.
alter table treatment_budgets add column down_payment numeric(10,2) not null default 0;
alter table treatment_budgets add column installments integer not null default 1;
alter table treatment_budgets add column discount numeric(10,2) not null default 0;

-- Evolução: nome do profissional responsável (sem tabela de profissionais
-- ainda — texto livre é suficiente pro MVP).
alter table evolutions add column professional text;

-- Financeiro: número da guia do convênio, quando aplicável (nulo pra
-- particular ou lançamentos sem convênio envolvido).
alter table transactions add column guia_number text;
