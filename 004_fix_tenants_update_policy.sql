-- ============================================================
-- Fix: tenants nunca teve policy de UPDATE — só SELECT (001).
-- Tenant não conseguia salvar business_hours nem theme_palette pela própria
-- conta (RLS bloqueava silenciosamente, sem erro, 0 linhas afetadas).
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create policy "tenant isolation - update" on tenants
  for update using (id = auth_tenant_id()) with check (id = auth_tenant_id());
