-- Funde valor_e_horarios + envio_link_agendamento (que ja tinha sido
-- fundido com confirmacao_horario na 029) — reduz mais uma volta de
-- mensagem, manda preco/horario/link tudo junto.
update message_templates set content =
  'Nossa consulta inicial tem duração média de 1h e o valor é {{valor_consulta}}. Retornos dentro de 30 dias não têm custo adicional. Atendemos {{horario_atendimento}}. Aqui está o link com os horários disponíveis — é só escolher o que for melhor pra você e confirmar sua consulta: {{link_agendamento}}'
where template_key = 'valor_e_horarios';

delete from message_templates where template_key = 'envio_link_agendamento';
