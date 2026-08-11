-- Quando a IA não consegue responder uma pergunta do paciente com os dados
-- que tem, escala pra atendimento humano e o bot fica em silêncio nessa
-- conversa (até a sessão expirar em 12h, que já reseta tudo).
alter table conversation_state add column escalated boolean not null default false;
