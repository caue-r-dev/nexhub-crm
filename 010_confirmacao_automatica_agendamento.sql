-- ============================================================
-- FASE: confirmação de agendamento via WhatsApp (botão, n8n) + PIX
-- automático no confirmar + cancelamento automático por silêncio
-- ============================================================
-- Valor padrão de sinal usado quando o paciente confirma a consulta pelo
-- botão do WhatsApp (n8n chama /api/automations/appointments/confirm) —
-- por tenant, cada um define o próprio valor. Null = não manda PIX
-- automático nessa confirmação (só marca confirmed).

alter table tenants add column default_deposit_amount numeric;
