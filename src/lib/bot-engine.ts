// Motor do bot de primeiro contato — conduz a conversa até o envio do link
// de agendamento público (já existente, não recria coleta de dados via
// chat). Chamado pelo webhook do Chatwoot quando a mensagem recebida não é
// resposta sim/não a uma confirmação pendente.
//
// Estágio avança de forma linear e previsível (qualquer mensagem recebida
// avança um estágio) — a IA (ver src/lib/ai-reply.ts) só reescreve o texto
// de cada estágio de forma natural, não decide o fluxo.
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTemplate } from '@/lib/message-templates'
import { humanizeReply } from '@/lib/ai-reply'
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

const STAGES = ['primeiro_contato', 'pergunta_queixa', 'explicacao_processo', 'valor_e_horarios'] as const
type Stage = (typeof STAGES)[number]

type TenantInfo = {
  id: string
  name: string
  address: string | null
  business_hours: BusinessHours | null
  slug: string | null
}

export function isSessionExpired(updatedAt: string | null, now: Date, maxHours = 12): boolean {
  if (!updatedAt) return false
  const elapsedMs = now.getTime() - new Date(updatedAt).getTime()
  return elapsedMs > maxHours * 60 * 60 * 1000
}

// Estágio seguinte a partir do último estágio já respondido pelo paciente.
// `currentStage` null (ou um valor que não bate com nenhum STAGES — sessão
// nunca salva, ou expirada) significa "contato novo": o próximo estágio é o
// primeiro da lista, não o segundo. Usar o nome do primeiro estágio como
// sentinela de "vazio" causava um bug onde todo contato novo pulava direto
// a saudação (`primeiro_contato`) e ia pra próxima pergunta.
export function computeNextStage(currentStage: string | null): Stage | null {
  const currentIndex = currentStage ? STAGES.indexOf(currentStage as Stage) : -1
  const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1
  return nextIndex < STAGES.length ? STAGES[nextIndex] : null
}

// `current_stage` é o estágio "lógico" (null se contato novo ou sessão
// expirada — usado por computeNextStage). `rawCurrentStage` é o valor
// exato que está gravado no banco agora (null só quando não existe linha
// nenhuma) — usado por saveConversationStateIfUnchanged pra checagem de
// concorrência, que precisa saber o valor real, não o "resetado".
async function getConversationState(tenantId: string, phone: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('conversation_state')
    .select('current_stage, captured_data, updated_at')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (!data) {
    return { current_stage: null as string | null, captured_data: {} as Record<string, unknown>, rawCurrentStage: null as string | null }
  }

  const expired = isSessionExpired(data.updated_at, new Date())
  return {
    current_stage: expired ? null : (data.current_stage as string | null),
    captured_data: expired ? ({} as Record<string, unknown>) : (data.captured_data as Record<string, unknown>),
    rawCurrentStage: data.current_stage as string,
  }
}

// Salva o próximo estágio SÓ SE ninguém mais avançou essa conversa nesse
// meio-tempo (comparação otimista contra `expectedRawCurrentStage`, o
// valor lido no início do processamento). Sem isso, duas mensagens do
// mesmo paciente chegando quase juntas (ex: 2 mensagens rápidas) geram 2
// respostas duplicadas — cada uma lê o mesmo estado "velho" antes da
// outra salvar (confirmado em produção: saudação mandada 2x pro mesmo
// contato). Retorna false quando perdeu a corrida — quem perdeu não deve
// mandar a mensagem que já preparou, ela ficaria duplicada/fora de ordem.
async function saveConversationStateIfUnchanged(
  tenantId: string,
  phone: string,
  expectedRawCurrentStage: string | null,
  nextStage: string,
  capturedData: Record<string, unknown>
): Promise<boolean> {
  const admin = createAdminClient()
  const updatedAt = new Date().toISOString()

  if (expectedRawCurrentStage === null) {
    // Contato nunca teve linha em conversation_state — insere. Se outra
    // mensagem concorrente já inseriu primeiro, a constraint unique
    // (tenant_id, contact_phone) rejeita e a gente sabe que perdeu.
    const { error } = await admin
      .from('conversation_state')
      .insert({ tenant_id: tenantId, contact_phone: phone, current_stage: nextStage, captured_data: capturedData, updated_at: updatedAt })
    return !error
  }

  const { data, error } = await admin
    .from('conversation_state')
    .update({ current_stage: nextStage, captured_data: capturedData, updated_at: updatedAt })
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .eq('current_stage', expectedRawCurrentStage)
    .select('id')

  return !error && !!data && data.length > 0
}

// Retorna o texto de resposta pra enviar, ou null se a conversa já tiver
// chegado ao fim do fluxo (link já enviado — não fica insistindo).
export async function getBotReply(tenant: TenantInfo, phone: string, incomingText: string): Promise<string | null> {
  const state = await getConversationState(tenant.id, phone)
  const nextStage = computeNextStage(state.current_stage)
  if (!nextStage) return null

  const capturedData = state.captured_data as Record<string, unknown>

  // Primeira mensagem livre do paciente (estágio pergunta_queixa) é
  // guardada como queixa capturada, pra reaproveitar em templates futuros.
  const updatedCapturedData =
    state.current_stage === 'pergunta_queixa' ? { ...capturedData, queixa: incomingText } : capturedData

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

  const context = {
    nome_clinica: tenant.name,
    endereco: tenant.address ?? '',
    nome_profissional: firstProfessional?.name ?? '',
    link_agendamento: linkAgendamento,
    valor_consulta: valorConsulta,
    horario_atendimento: horarioAtendimento,
  }

  const DEFAULTS: Record<Stage, string> = {
    primeiro_contato: `Olá! Boas-vindas à ${tenant.name}. Ficamos felizes com seu contato! Pra te conhecer melhor: qual o seu nome?`,
    pergunta_queixa: 'Prazer! Pra te atender melhor, me conta: você tem alguma necessidade específica ou já sabe o que gostaria de resolver?',
    explicacao_processo: `Perfeito! Pra começar, o primeiro passo é uma consulta inicial de avaliação${firstProfessional?.name ? `: ${firstProfessional.name}` : ''} vai entender sua necessidade e montar um plano personalizado, tirando todas as suas dúvidas. Podemos agendar essa consulta inicial?`,
    valor_e_horarios: `${valorConsulta ? `Nossa consulta inicial tem o valor de ${valorConsulta}. ` : ''}${horarioAtendimento ? `Atendemos ${horarioAtendimento}. ` : ''}${
      linkAgendamento
        ? `Aqui está o link com os horários disponíveis — é só escolher o que for melhor pra você e confirmar sua consulta: ${linkAgendamento}`
        : 'Entre em contato com a recepção pra agendar seu horário.'
    }`,
  }

  const scriptText = await resolveTemplate(tenant.id, nextStage, context, DEFAULTS[nextStage])
  const reply = await humanizeReply(scriptText, incomingText)

  const saved = await saveConversationStateIfUnchanged(tenant.id, phone, state.rawCurrentStage, nextStage, updatedCapturedData)
  // Perdeu a corrida: outra mensagem concorrente do mesmo contato já
  // avançou esse estágio enquanto essa aqui rodava — não manda, senão
  // duplica a resposta.
  if (!saved) return null

  return reply
}
