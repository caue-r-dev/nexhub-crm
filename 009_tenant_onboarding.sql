-- ============================================================
-- FASE: onboarding de tenant criado via "gerar teste" (admin)
-- ============================================================
-- Tenants criados pelo /cadastro tradicional já preenchem nome/nicho/paleta
-- na hora, então nascem com onboarding_completed = true (default). Só
-- tenants criados via generateTrialTenantAction (painel admin) nascem com
-- false e passam pela tela /onboarding no primeiro login.

alter table tenants add column onboarding_completed boolean not null default true;
