-- ============================================================
-- FASE: forcar troca de senha temporaria no primeiro acesso
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table users add column must_change_password boolean not null default false;

-- Usuário logado precisa poder derrubar a própria flag ao trocar a senha
-- temporária (server action roda com a sessão dele, sujeita a RLS).
create policy "users can update own row" on users
  for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());
