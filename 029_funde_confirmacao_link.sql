-- Funde confirmacao_horario + envio_link_agendamento num só (bot mandava
-- "vou te enviar o link" e esperava resposta antes de mandar de verdade).
update message_templates set content =
  'Show! Aqui está o link com os horários disponíveis — é só escolher o que for melhor pra você e confirmar sua consulta: {{link_agendamento}}'
where template_key = 'envio_link_agendamento';

delete from message_templates where template_key = 'confirmacao_horario';
