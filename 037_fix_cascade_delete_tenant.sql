-- ============================================================
-- FASE: corrige FK sem cascade que impedia apagar tenant no admin
-- (message_templates, conversation_state, prostheses ficaram sem
-- "on delete cascade" desde que foram criadas)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table message_templates drop constraint message_templates_tenant_id_fkey;
alter table message_templates add constraint message_templates_tenant_id_fkey
  foreign key (tenant_id) references tenants(id) on delete cascade;

alter table conversation_state drop constraint conversation_state_tenant_id_fkey;
alter table conversation_state add constraint conversation_state_tenant_id_fkey
  foreign key (tenant_id) references tenants(id) on delete cascade;

alter table prostheses drop constraint prostheses_tenant_id_fkey;
alter table prostheses add constraint prostheses_tenant_id_fkey
  foreign key (tenant_id) references tenants(id) on delete cascade;
