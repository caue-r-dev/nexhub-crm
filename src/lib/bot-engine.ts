// Motor do bot de primeiro contato — conduz a conversa até o envio do link
// de agendamento público (já existente, não recria coleta de dados via
// chat). Chamado pelo webhook do Chatwoot quando a mensagem recebida não é
// resposta sim/não a uma confirmação pendente.
//
// Estágio avança de forma linear e previsível (qualquer mensagem recebida
// avança um estágio, DESDE QUE a IA classifique como resposta ao estágio —
// ver classifyMessage) — a IA (ver src/lib/ai-reply.ts) reescreve o texto
// de cada estágio de forma natural, e também decide (src/lib/smart-reply.ts)
// se a mensagem do paciente é uma pergunta fora do roteiro respondível com
// os dados da clínica, ou algo que precisa escalar pra atendimento humano.
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTemplate } from '@/lib/message-templates'
import { humanizeReply } from '@/lib/ai-reply'
import { classifyMessage } from '@/lib/smart-reply'
import type { BusinessHours } from '@/lib/supabase/types'

const ESCALATION_MESSAGE = 'Vou confirmar essa informação com a equipe e já te retorno por aqui. 🙂'

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
  bot_context_notes: string | null
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
    .select('current_stage, captured_data, updated_at, escalated')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (!data) {
    return {
      current_stage: null as string | null,
      captured_data: {} as Record<string, unknown>,
      rawCurrentStage: null as string | null,
      escalated: false,
    }
  }

  const expired = isSessionExpired(data.updated_at, new Date())
  return {
    current_stage: expired ? null : (data.current_stage as string | null),
    captured_data: expired ? ({} as Record<string, unknown>) : (data.captured_data as Record<string, unknown>),
    rawCurrentStage: data.current_stage as string,
    escalated: expired ? false : data.escalated,
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

// Marca a conversa como escalada pra atendimento humano — bot fica em
// silêncio nela até a sessão expirar (12h). Não mexe no estágio, só na
// flag, pra não perder o progresso caso alguém retome depois.
async function escalateConversation(tenantId: string, phone: string, expectedRawCurrentStage: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('conversation_state')
    .update({ escalated: true, updated_at: new Date().toISOString() })
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
  if (state.escalated) return null

  const nextStage = computeNextStage(state.current_stage)
  if (!nextStage) return null

  const capturedData = state.captured_data as Record<string, unknown>

  // Resposta ao "qual seu nome?" (primeiro_contato) e à queixa
  // (pergunta_queixa) são guardadas pra reaproveitar no resto da conversa
  // (ex: chamar o paciente pelo nome nas próximas mensagens).
  const updatedCapturedData =
    state.current_stage === 'primeiro_contato'
      ? { ...capturedData, nome: incomingText.trim() }
      : state.current_stage === 'pergunta_queixa'
        ? { ...capturedData, queixa: incomingText }
        : capturedData

  const nomePaciente = (updatedCapturedData.nome as string | undefined) ?? ''

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
    nome_paciente: nomePaciente,
  }

  const DEFAULTS: Record<Stage, string> = {
    primeiro_contato: `Olá! Boas-vindas à ${tenant.name}. Ficamos felizes com seu contato! Pra te conhecer melhor: qual o seu nome?`,
    pergunta_queixa: `Prazer${nomePaciente ? `, ${nomePaciente}` : ''}! Pra te atender melhor, me conta: você tem alguma necessidade específica ou já sabe o que gostaria de resolver?`,
    explicacao_processo: `Perfeito! Pra começar, o primeiro passo é uma consulta inicial de avaliação${firstProfessional?.name ? `: ${firstProfessional.name}` : ''} vai entender sua necessidade e montar um plano personalizado, tirando todas as suas dúvidas. Podemos agendar essa consulta inicial?`,
    valor_e_horarios: `${valorConsulta ? `Nossa consulta inicial tem o valor de ${valorConsulta}. ` : ''}${horarioAtendimento ? `Atendemos ${horarioAtendimento}. ` : ''}${
      linkAgendamento
        ? `Aqui está o link com os horários disponíveis — é só escolher o que for melhor pra você e confirmar sua consulta: ${linkAgendamento}`
        : 'Entre em contato com a recepção pra agendar seu horário.'
    }`,
  }

  // Só classifica quando já existe uma pergunta pendente de verdade — na
  // primeiríssima mensagem de um contato novo (state.current_stage null),
  // o bot ainda não perguntou nada, não tem o que classificar.
  if (state.current_stage) {
    const knownFacts = [
      `Nome da clínica: ${tenant.name}`,
      tenant.address ? `Endereço: ${tenant.address}` : null,
      firstProfessional?.name ? `Profissional: ${firstProfessional.name}` : null,
      valorConsulta ? `Valor da consulta inicial: ${valorConsulta}` : null,
      horarioAtendimento ? `Horário de atendimento: ${horarioAtendimento}` : null,
      linkAgendamento ? `Link de agendamento: ${linkAgendamento}` : null,
      tenant.bot_context_notes ? `Observações adicionais: ${tenant.bot_context_notes}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const pendingQuestion = await resolveTemplate(
      tenant.id,
      state.current_stage,
      context,
      DEFAULTS[state.current_stage as Stage]
    )
    const classification = await classifyMessage(pendingQuestion, incomingText, knownFacts)

    if (classification.kind === 'escalar') {
      const escalated = await escalateConversation(tenant.id, phone, state.rawCurrentStage as string)
      return escalated ? ESCALATION_MESSAGE : null
    }

    if (classification.kind === 'responde_pergunta') {
      // Não avança estágio — a pergunta pendente continua sem resposta, o
      // paciente ainda precisa respondê-la na próxima mensagem.
      return classification.answer
    }

    // classification.kind === 'responde_estagio' — segue o fluxo normal abaixo.
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
