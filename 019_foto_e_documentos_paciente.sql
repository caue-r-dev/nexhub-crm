-- ============================================================
-- FASE: foto de perfil e documentos individuais do paciente
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table clients add column photo_path text;

-- Bucket privado. Estrutura de path: {tenant_id}/{client_id}/foto-*
-- (foto de perfil) e {tenant_id}/{client_id}/documentos/* (anexos).
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

create policy "client-files tenant select" on storage.objects
  for select using (bucket_id = 'client-files' and (storage.foldername(name))[1] = auth_tenant_id()::text);

create policy "client-files tenant insert" on storage.objects
  for insert with check (bucket_id = 'client-files' and (storage.foldername(name))[1] = auth_tenant_id()::text);

create policy "client-files tenant update" on storage.objects
  for update using (bucket_id = 'client-files' and (storage.foldername(name))[1] = auth_tenant_id()::text);

create policy "client-files tenant delete" on storage.objects
  for delete using (bucket_id = 'client-files' and (storage.foldername(name))[1] = auth_tenant_id()::text);
