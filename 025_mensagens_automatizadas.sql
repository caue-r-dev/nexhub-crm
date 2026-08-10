create table message_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  template_key text not null,
  content text not null,
  active boolean default true,
  updated_at timestamptz default now(),
  unique(tenant_id, template_key)
);

alter table message_templates enable row level security;

create policy "tenant isolation" on message_templates
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

create table conversation_state (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  contact_phone text not null,
  current_stage text not null default 'primeiro_contato',
  captured_data jsonb default '{}',
  updated_at timestamptz default now(),
  unique(tenant_id, contact_phone)
);

alter table conversation_state enable row level security;

create policy "tenant isolation" on conversation_state
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

alter table appointments add column followup_atraso_sent_at timestamptz;
alter table appointments add column followup_falta_sent_at timestamptz;

-- seed dos templates padrao pra todo tenant existente (novos tenants sao
-- semeados no onboarding, ver src/app/actions/tenant-onboarding ou signup)
insert into message_templates (tenant_id, template_key, content)
select t.id, k.template_key, k.content
from tenants t
cross join (values
  ('primeiro_contato', 'Olá! Bem-vindo(a) à {{nome_clinica}}. Como podemos te ajudar hoje?'),
  ('pergunta_queixa', 'Pra te atender melhor, me conta rapidinho o que você está sentindo ou o que gostaria de resolver?'),
  ('explicacao_processo', 'Entendi! Nosso processo é simples: avaliação inicial com {{nome_profissional}}, diagnóstico e plano de tratamento. Posso te passar os horários disponíveis?'),
  ('valor_e_horarios', 'O valor da consulta de avaliação é {{valor_consulta}}. Atendemos em {{horario_atendimento}}, na {{endereco}}.'),
  ('confirmacao_horario', 'Perfeito! Vou te mandar o link pra você escolher o melhor horário.'),
  ('envio_link_agendamento', 'Aqui está o link pra você agendar direto no horário que preferir: {{link_agendamento}}'),
  ('agendamento_confirmado', 'Consulta confirmada! Te esperamos na {{nome_clinica}}.'),
  ('orientacao_procedimento_longo', 'Só um aviso: seu procedimento tem duração maior, recomendamos chegar com 10 minutos de antecedência e reservar bem o horário na agenda.'),
  ('followup_falta_sem_remarcar', 'Olá {{nome_paciente}}! Sentimos sua falta na consulta e ainda não remarcamos. Quer escolher um novo horário? {{link_agendamento}}'),
  ('followup_atraso', 'Olá {{nome_paciente}}! Sua consulta era às {{horario_consulta}} e ainda não te vimos por aqui. Está tudo bem? Ainda vem?')
) as k(template_key, content)
on conflict (tenant_id, template_key) do nothing;
