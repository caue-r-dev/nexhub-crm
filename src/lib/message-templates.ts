// Resolução central de template + variável — usada tanto pelo bot de
// primeiro contato (webhook Chatwoot) quanto por disparo manual/automações
// (confirmação de agendamento, follow-up de falta/atraso). Uma função só
// evita template divergir de contexto pra contexto.
import { createAdminClient } from '@/lib/supabase/admin'

export type TemplateContext = {
  nome_clinica?: string
  endereco?: string
  horario_atendimento?: string
  nome_profissional?: string
  valor_consulta?: string
  nome_paciente?: string
  data_consulta?: string
  horario_consulta?: string
  procedimento?: string
  link_agendamento?: string
}

// Variável ausente do contexto vira string vazia, nunca o placeholder cru
// — "{{endereco}}" aparecendo pro paciente de verdade é pior que uma frase
// com um buraco (aconteceu: confirmação de agendamento não passava
// endereco no contexto, template mostrou o placeholder literal).
function applyVars(content: string, vars: TemplateContext): string {
  return content.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => vars[key as keyof TemplateContext] ?? '')
}

// Busca o template ativo do tenant; se não existir linha (tenant antigo,
// migração não rodou seed, ou key nova) cai pro fallback passado por quem
// chamou — nunca quebra o fluxo de mensagem por falta de template.
export async function resolveTemplate(
  tenantId: string,
  templateKey: string,
  context: TemplateContext,
  fallback: string
): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('message_templates')
    .select('content')
    .eq('tenant_id', tenantId)
    .eq('template_key', templateKey)
    .eq('active', true)
    .maybeSingle()

  const content = data?.content?.trim() || fallback
  return applyVars(content, context)
}

export const TEMPLATE_KEYS = [
  { key: 'primeiro_contato', label: 'Primeiro contato' },
  { key: 'pergunta_queixa', label: 'Pergunta sobre a queixa' },
  { key: 'explicacao_processo', label: 'Explicação do processo' },
  { key: 'valor_e_horarios', label: 'Valor, horários e link de agendamento' },
  { key: 'agendamento_confirmado', label: 'Agendamento confirmado' },
  { key: 'orientacao_procedimento_longo', label: 'Orientação — procedimento longo' },
  { key: 'followup_falta_sem_remarcar', label: 'Follow-up — faltou e não remarcou' },
  { key: 'followup_atraso', label: 'Follow-up — atraso' },
] as const
