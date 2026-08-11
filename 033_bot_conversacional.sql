-- Troca o motor do bot de "estágio fixo" pra "IA conduz a conversa com
-- memória real do histórico". `messages` guarda o histórico (paciente +
-- bot) que a IA usa como contexto a cada turno. `done` substitui o
-- conceito antigo de "chegou no último estágio" (link já mandado, não
-- insiste mais).
alter table conversation_state add column messages jsonb not null default '[]';
alter table conversation_state add column done boolean not null default false;
