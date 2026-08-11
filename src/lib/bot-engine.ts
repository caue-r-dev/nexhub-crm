// Motor do bot de atendimento — a IA (src/lib/conversational-bot.ts)
// conduz a conversa de verdade, com memória do histórico completo, usando
// o roteiro personalizado de cada tenant como guia (não uma sequência
// fixa obrigatória): extrai fatos de qualquer parte da mensagem, pula
// etapa já resolvida, responde pergunta fora de ordem quando os dados
// conhecidos permitem, e escala pra atendimento humano quando reconhece
// que não é caso de lead novo ou não sabe responder com confiança.
// Chamado pelo webhook do Chatwoot quando a mensagem recebida não é
// resposta sim/não a uma confirmação pendente.
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTemplate } from '@/lib/message-templates'
import { decideBotTurn, type ConversationMessage } from '@/lib/conversational-bot'
import type { BusinessHours } from '@/lib/supabase/types'

const WEEKDAY_LABELS: Record<keyof BusinessHours, string> = {
  monday: 'seg',
  tuesday: 'ter',
  wednesday: 'qua',
  thursday: 'qui',
  friday: 'sex',
  saturday: 'sáb',
  sunday: 'dom',
}

// Junta dias com o mesmo horário num intervalo (ex: seg-sex 08:00-18:00)
// em vez de listar dia por dia — mais legível numa mensagem de WhatsApp.
function formatBusinessHours(hours: BusinessHours | null): string {
  if (!hours) return ''
  const days = (Object.keys(WEEKDAY_LABELS) as (keyof BusinessHours)[]).filter((d) => hours[d]?.active)
  if (days.length === 0) return ''

  const groups: { label: string; start: string; end: string }[] = []
  for (const day of days) {
    const { start, end } = hours[day]
    const last = groups[groups.length - 1]
    if (last && last.start === start && last.end === end) {
      last.label = last.label.includes('-') ? last.label.replace(/-\w+$/, `-${WEEKDAY_LABELS[day]}`) : `${last.label}-${WEEKDAY_LABELS[day]}`
    } else {
      groups.push({ label: WEEKDAY_LABELS[day], start, end })
    }
  }

  return groups.map((g) => `${g.label} ${g.start}-${g.end}`).join(', ')
}

const ROTEIRO_STAGES = [
  { key: 'primeiro_contato', label: 'Primeiro contato' },
  { key: 'pergunta_queixa', label: 'Entender a necessidade' },
  { key: 'explicacao_processo', label: 'Explicar o processo' },
  { key: 'valor_e_horarios', label: 'Valor, horários e link' },
] as const

type TenantInfo = {
  id: string
  name: string
  address: string | null
  business_hours: BusinessHours | null
  slug: string | null
  bot_context_notes: string | null
}

export function isSessionExpired(updatedAt: string | null, now: Date, maxHours = 12): boolean {
  if (!updatedAt) return false
  const elapsedMs = now.getTime() - new Date(updatedAt).getTime()
  return elapsedMs > maxHours * 60 * 60 * 1000
}

type ConversationState = {
  captured_data: Record<string, string>
  messages: ConversationMessage[]
  done: boolean
  escalated: boolean
  // Valor exato de `updated_at` lido agora (null = linha não existe ainda)
  // — usado como token de concorrência otimista no save: se ninguém mais
  // escreveu nessa linha nesse meio-tempo, `updated_at` continua igual.
  expectedUpdatedAt: string | null
}

async function getConversationState(tenantId: string, phone: string): Promise<ConversationState> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('conversation_state')
    .select('captured_data, updated_at, escalated, messages, done')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (!data) {
    return { captured_data: {}, messages: [], done: false, escalated: false, expectedUpdatedAt: null }
  }

  const expired = isSessionExpired(data.updated_at, new Date())
  return {
    captured_data: expired ? {} : (data.captured_data as Record<string, string>),
    messages: expired ? [] : data.messages,
    done: expired ? false : data.done,
    escalated: expired ? false : data.escalated,
    expectedUpdatedAt: data.updated_at,
  }
}

// Salva o novo estado SÓ SE ninguém mais escreveu nessa conversa nesse
// meio-tempo (comparação otimista contra `updated_at` lido no início do
// processamento). Sem isso, duas mensagens do mesmo paciente chegando
// quase juntas geram 2 respostas concorrentes pisando uma na outra —
// confirmado em produção antes dessa proteção existir (saudação
// duplicada). Retorna false quando perdeu a corrida — quem perdeu não
// deve mandar a resposta que já preparou.
async function saveConversationStateIfUnchanged(
  tenantId: string,
  phone: string,
  expectedUpdatedAt: string | null,
  fields: { messages: ConversationMessage[]; captured_data: Record<string, string>; done: boolean; escalated: boolean }
): Promise<boolean> {
  const admin = createAdminClient()
  const updatedAt = new Date().toISOString()

  if (expectedUpdatedAt === null) {
    // Contato nunca teve linha em conversation_state — insere. Se outra
    // mensagem concorrente já inseriu primeiro, a constraint unique
    // (tenant_id, contact_phone) rejeita e a gente sabe que perdeu.
    const { error } = await admin
      .from('conversation_state')
      .insert({ tenant_id: tenantId, contact_phone: phone, updated_at: updatedAt, ...fields })
    return !error
  }

  const { data, error } = await admin
    .from('conversation_state')
    .update({ updated_at: updatedAt, ...fields })
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .eq('updated_at', expectedUpdatedAt)
    .select('id')

  return !error && !!data && data.length > 0
}

// Concatena o roteiro personalizado do tenant (texto de cada etapa,
// customizado por clínica em /configuracoes/mensagens, ou o padrão se
// nunca editou) — é isso que a IA usa como guia do que cobrir na
// conversa, na ordem que fizer sentido, sem ser uma sequência obrigatória.
async function buildRoteiro(
  tenantId: string,
  defaults: Record<(typeof ROTEIRO_STAGES)[number]['key'], string>
): Promise<string> {
  const parts = await Promise.all(
    ROTEIRO_STAGES.map(async ({ key, label }, i) => {
      const text = await resolveTemplate(tenantId, key, {}, defaults[key])
      return `${i + 1}. ${label}: "${text}"`
    })
  )
  return parts.join('\n')
}

// Retorna o texto de resposta pra enviar, ou null se a conversa já tiver
// terminado (link já enviado, "done") ou estiver escalada pra humano.
export async function getBotReply(tenant: TenantInfo, phone: string, incomingText: string): Promise<string | null> {
  const state = await getConversationState(tenant.id, phone)
  if (state.done || state.escalated) return null

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nexhub.nexvix.com.br'
  const linkAgendamento = tenant.slug ? `${appUrl}/agendar/${tenant.slug}` : ''

  const { data: firstProfessional } = await admin
    .from('professionals')
    .select('name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  const { data: firstService } = await admin
    .from('services')
    .select('default_value')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('default_value', { ascending: true })
    .limit(1)
    .maybeSingle()

  const valorConsulta = firstService?.default_value != null ? `R$ ${firstService.default_value.toFixed(2)}` : ''
  const horarioAtendimento = formatBusinessHours(tenant.business_hours)

  const knownFacts = [
    `Nome: ${tenant.name}`,
    tenant.address ? `Endereço: ${tenant.address}` : null,
    firstProfessional?.name ? `Profissional: ${firstProfessional.name}` : null,
    valorConsulta ? `Valor da consulta/atendimento inicial: ${valorConsulta}` : null,
    horarioAtendimento ? `Horário de atendimento: ${horarioAtendimento}` : null,
    linkAgendamento ? `Link de agendamento: ${linkAgendamento}` : null,
    tenant.bot_context_notes ? `Observações adicionais: ${tenant.bot_context_notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const DEFAULTS = {
    primeiro_contato: `Dar boas-vindas em nome de "${tenant.name}" e perguntar o nome do contato.`,
    pergunta_queixa: 'Perguntar qual a necessidade específica ou o que a pessoa gostaria de resolver.',
    explicacao_processo: `Explicar que o primeiro passo é um atendimento inicial de avaliação${firstProfessional?.name ? ` com ${firstProfessional.name}` : ''}, que vai entender a necessidade e montar um plano personalizado.`,
    valor_e_horarios: `Informar o valor${valorConsulta ? ` (${valorConsulta})` : ''}, o horário de atendimento${horarioAtendimento ? ` (${horarioAtendimento})` : ''} e mandar o link de agendamento${linkAgendamento ? ` (${linkAgendamento})` : ''}.`,
  }

  const roteiro = await buildRoteiro(tenant.id, DEFAULTS)

  const turn = await decideBotTurn(roteiro, knownFacts, state.captured_data, state.messages, incomingText)

  const newMessages: ConversationMessage[] = [
    ...state.messages,
    { role: 'paciente', text: incomingText },
    ...(turn.reply ? ([{ role: 'bot', text: turn.reply }] as ConversationMessage[]) : []),
  ]

  const saved = await saveConversationStateIfUnchanged(tenant.id, phone, state.expectedUpdatedAt, {
    messages: newMessages,
    captured_data: { ...state.captured_data, ...turn.extractedFacts },
    done: turn.done,
    escalated: turn.handoff,
  })
  // Perdeu a corrida: outra mensagem concorrente do mesmo contato já
  // escreveu nessa conversa enquanto essa aqui rodava — não manda, senão
  // duplica/desalinha a resposta.
  if (!saved) return null

  return turn.reply
}
