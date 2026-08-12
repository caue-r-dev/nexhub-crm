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
import { resolveTemplate, getStoredTemplate } from '@/lib/message-templates'
import { decideBotTurn, HANDOFF_FALLBACK_MESSAGE, type ConversationMessage } from '@/lib/conversational-bot'
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

const DEFAULT_CONTATO_RECORRENTE =
  'Olá! Que bom ter você de volta. Já te conhecemos por aqui — em breve alguém da equipe retorna sua mensagem. Se for urgente, me conta o que você precisa que já sinalizamos.'

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
  public_booking_enabled: boolean
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
  // Já existiu linha alguma vez pra esse telefone, independente de ter
  // expirado — diferencia "nunca falou com a gente" de "já falou, sumiu
  // e voltou depois da sessão expirar" (contato recorrente).
  hasHistory: boolean
  // Sessão sem linha nenhuma OU expirada — é o início de uma conversa
  // "nova" do ponto de vista do bot, mesmo que hasHistory seja true.
  isNewSession: boolean
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
    return {
      captured_data: {},
      messages: [],
      done: false,
      escalated: false,
      expectedUpdatedAt: null,
      hasHistory: false,
      isNewSession: true,
    }
  }

  const expired = isSessionExpired(data.updated_at, new Date())
  return {
    captured_data: expired ? {} : (data.captured_data as Record<string, string>),
    messages: expired ? [] : data.messages,
    done: expired ? false : data.done,
    escalated: expired ? false : data.escalated,
    expectedUpdatedAt: data.updated_at,
    hasHistory: true,
    isNewSession: expired,
  }
}

// Chamado pelo webhook quando o Chatwoot reporta uma mensagem "outgoing"
// (reflexo de qualquer envio pelo número — nosso reply automático OU o
// dono digitando direto no celular; não existe webhook nativo do
// WhatsApp que diferencie os dois). Se o texto bate com a última
// resposta que o próprio bot salvou, é eco do bot — ignora. Se não bate,
// foi humano que escreveu — bot cala a boca pra essa conversa (mesma
// janela de 12h de qualquer sessão expirada).
export async function markEscalatedIfHumanSent(tenantId: string, phone: string, content: string): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('conversation_state')
    .select('messages, escalated')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (!data || data.escalated) return

  const messages = data.messages as ConversationMessage[]
  const lastBot = [...messages].reverse().find((m) => m.role === 'bot')
  if (lastBot && lastBot.text.trim() === content.trim()) return

  await admin.from('conversation_state').update({ escalated: true }).eq('tenant_id', tenantId).eq('contact_phone', phone)
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
  const withStored = await Promise.all(
    ROTEIRO_STAGES.map(async ({ key, label }) => {
      const stored = await getStoredTemplate(tenantId, key)
      // Card excluído (hidden) pula a etapa inteira em vez de cair no
      // texto padrão — dono decidiu que o bot não deve nem tocar nesse
      // assunto, diferente de só desativar (que ainda usa o default).
      if (stored?.hidden) return null
      const text = stored?.active ? stored.content.trim() || defaults[key] : defaults[key]
      return { label, text }
    })
  )
  const parts = withStored
    .filter((s) => s !== null)
    .map((s, i) => `${i + 1}. ${s.label}: "${s.text}"`)
  return parts.join('\n')
}

// Retorna o texto de resposta pra enviar, ou null se a conversa já tiver
// terminado (link já enviado, "done") ou estiver escalada pra humano.
export async function getBotReply(tenant: TenantInfo, phone: string, incomingText: string): Promise<string | null> {
  const state = await getConversationState(tenant.id, phone)
  // `escalated` é silêncio total (humano assumiu). `done` NÃO é — só quer
  // dizer "já mandou o link, não insista de novo à toa"; o bot continua
  // respondendo pergunta nova depois disso (confirmado em teste real: bot
  // ficou mudo pra "quais as formas de pagamento?" só porque tinha mandado
  // o link na resposta anterior — não fazia sentido).
  if (state.escalated) return null

  // Já falou com a gente antes (mesmo que a sessão tenha expirado) —
  // não repete o roteiro de lead novo perguntando tudo de novo. Manda
  // um "boas-vindas de volta" fixo e já escala pra humano — dono decidiu
  // que ele mesmo assume a partir daqui.
  if (state.hasHistory && state.isNewSession) {
    const message = await resolveTemplate(tenant.id, 'contato_recorrente', { nome_clinica: tenant.name }, DEFAULT_CONTATO_RECORRENTE)
    const saved = await saveConversationStateIfUnchanged(tenant.id, phone, state.expectedUpdatedAt, {
      messages: [...state.messages, { role: 'paciente', text: incomingText }, { role: 'bot', text: message }],
      captured_data: state.captured_data,
      done: true,
      escalated: true,
    })
    return saved ? message : null
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nexhub.nexvix.com.br'
  const linkAgendamento = tenant.slug && tenant.public_booking_enabled ? `${appUrl}/agendar/${tenant.slug}` : ''

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
    state.done
      ? 'O link de agendamento já foi enviado nesta conversa (veja o histórico) — não repita o link nem insista em agendar de novo à toa, mas continue respondendo normalmente qualquer pergunta nova que o paciente fizer.'
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const DEFAULTS = {
    primeiro_contato: `Dar boas-vindas em nome de "${tenant.name}" e perguntar o nome do contato.`,
    pergunta_queixa: 'Perguntar qual a necessidade específica ou o que a pessoa gostaria de resolver.',
    explicacao_processo: `Explicar que o primeiro passo é um atendimento inicial de avaliação${firstProfessional?.name ? ` com ${firstProfessional.name}` : ''}, que vai entender a necessidade e montar um plano personalizado.`,
    valor_e_horarios: tenant.public_booking_enabled
      ? `Informar o valor${valorConsulta ? ` (${valorConsulta})` : ''}, o horário de atendimento${horarioAtendimento ? ` (${horarioAtendimento})` : ''} e mandar o link de agendamento${linkAgendamento ? ` (${linkAgendamento})` : ''}.`
      : `Informar o valor${valorConsulta ? ` (${valorConsulta})` : ''} e o horário de atendimento${horarioAtendimento ? ` (${horarioAtendimento})` : ''}, avisar que vai verificar a disponibilidade e confirmar o melhor horário por mensagem em seguida — não existe link de agendamento pra mandar.`,
  }

  const roteiro = await buildRoteiro(tenant.id, DEFAULTS)

  const handoffMessage = await resolveTemplate(tenant.id, 'escalar_atendimento_humano', {}, HANDOFF_FALLBACK_MESSAGE)
  const turn = await decideBotTurn(roteiro, knownFacts, state.captured_data, state.messages, incomingText, handoffMessage)

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
