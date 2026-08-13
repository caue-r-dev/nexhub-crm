-- Corrige race condition de double-booking: sob requisições concorrentes,
-- a checagem de conflito em app code (SELECT antes do INSERT) não é atômica
-- e deixa passar múltiplos agendamentos pro mesmo profissional/horário.
-- Constraint de exclusão no banco é a única forma correta de garantir isso
-- sob concorrência real (last line of defense; a checagem em app code
-- continua existindo só pra dar erro rápido antes de bater no banco).
--
-- `datetime + duration_min * interval` não pode entrar direto na expressão
-- da constraint: soma de timestamptz + interval é STABLE (depende de fuso/
-- DST), Postgres exige IMMUTABLE em expressão de índice (erro 42P17). Por
-- isso materializa end_datetime via trigger antes do insert/update, e a
-- constraint só referencia colunas já resolvidas.
create extension if not exists btree_gist;

alter table appointments add column if not exists end_datetime timestamptz;

create or replace function set_appointment_end_datetime()
returns trigger as $$
begin
  new.end_datetime := new.datetime + (new.duration_min * interval '1 minute');
  return new;
end;
$$ language plpgsql;

create trigger appointments_set_end_datetime
  before insert or update of datetime, duration_min on appointments
  for each row execute function set_appointment_end_datetime();

update appointments set end_datetime = datetime + (duration_min * interval '1 minute') where end_datetime is null;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(datetime, end_datetime, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));
