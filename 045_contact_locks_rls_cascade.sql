-- Corrige dois gaps achados em review: contact_locks nasceu sem RLS
-- (diferente de toda outra tabela com escopo de tenant no projeto —
-- ficava alcançável via chave anon pública, permitindo apagar locks
-- alheios e reabrir a race, ou criar locks que nunca liberam) e sem
-- on delete cascade na FK (padrão adotado desde a migration 037, depois
-- de um bug de tenant preso por causa disso).
alter table contact_locks enable row level security;

alter table contact_locks drop constraint contact_locks_tenant_id_fkey;
alter table contact_locks add constraint contact_locks_tenant_id_fkey
  foreign key (tenant_id) references tenants(id) on delete cascade;
