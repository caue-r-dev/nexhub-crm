-- Atualiza o CONTEÚDO dos templates existentes pro script real (universalizado
-- pra qualquer tipo de profissional, não só odonto) fornecido pelo usuário.
-- Roda pra todo tenant — cada um pode reescrever depois no painel
-- /configuracoes/mensagens se quiser um tom diferente.

update message_templates set content =
  'Olá! Boas-vindas à {{nome_clinica}}. Ficamos felizes com seu contato! Pra te conhecer melhor: qual o seu nome?'
where template_key = 'primeiro_contato';

update message_templates set content =
  'Prazer! Pra te atender melhor, me conta: você tem alguma necessidade específica ou já sabe o que gostaria de resolver?'
where template_key = 'pergunta_queixa';

update message_templates set content =
  'Perfeito! Pra começar, o primeiro passo é uma consulta inicial de avaliação: {{nome_profissional}} vai entender sua necessidade e montar um plano personalizado, tirando todas as suas dúvidas. Podemos agendar essa consulta inicial?'
where template_key = 'explicacao_processo';

update message_templates set content =
  'Nossa consulta inicial tem duração média de 1h e o valor é {{valor_consulta}}. Retornos dentro de 30 dias não têm custo adicional. Atendemos {{horario_atendimento}}. Quando prefere vir?'
where template_key = 'valor_e_horarios';

update message_templates set content =
  'Show! Vou te mandar o link com os horários disponíveis — é só escolher o que for melhor pra você.'
where template_key = 'confirmacao_horario';

update message_templates set content =
  'Aqui está o link pra você escolher o horário e confirmar sua consulta: {{link_agendamento}}'
where template_key = 'envio_link_agendamento';

update message_templates set content =
  'Agendado! Pra facilitar sua vinda: aceitamos Pix, cartão e dinheiro. Ficamos em {{endereco}}. Chegue com 5 minutos de antecedência. Se tiver exames anteriores (raio-x, tomografia etc), pode trazer ou nos enviar antes. Qualquer dúvida é só chamar — te esperamos!'
where template_key = 'agendamento_confirmado';

update message_templates set content =
  'Só um aviso: seu atendimento vai levar mais tempo que o normal. Pra ficar mais confortável: use roupas leves, pode trazer fone de ouvido, e pode se alimentar normalmente antes. Qualquer coisa é só pedir!'
where template_key = 'orientacao_procedimento_longo';

update message_templates set content =
  'Olá! Aqui é a {{nome_clinica}}. Vimos que você não conseguiu comparecer na sua última consulta e ainda não remarcamos. Sabemos que imprevistos acontecem — quer escolher um novo horário? {{link_agendamento}}'
where template_key = 'followup_falta_sem_remarcar';

update message_templates set content =
  'Olá! Aqui é a {{nome_clinica}}. Você está chegando? Ficamos preocupados quando não vemos o paciente no horário — está tudo bem?'
where template_key = 'followup_atraso';
