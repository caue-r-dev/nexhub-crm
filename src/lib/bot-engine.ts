// Motor do bot de primeiro contato — conduz a conversa até o envio do link
// de agendamento público (já existente, não recria coleta de dados via
// chat). Chamado pelo webhook do Chatwoot quando a mensagem recebida não é
// resposta sim/não a uma confirmação pendente.
//
// Depende de ANTHROPIC_API_KEY. Sem a chave configurada, o motor não roda —
// getBotReply retorna null e o webhook simplesmente ignora a mensagem (não
// quebra o fluxo existente de confirmação/cancelamento).
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveTemplate } from '@/lib/message-templates'

const STAGES = [
  'primeiro_contato',
  'pergunta_queixa',
  'explicacao_processo',
  'valor_e_horarios',
  'confirmacao_horario',
  'envio_link_agendamento',
] as const
type Stage = (typeof STAGES)[number]

type TenantInfo = {
  id: string
  name: string
  address: string | null
  business_hours: unknown
  slug: string | null
}

async function getConversationState(tenantId: string, phone: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('conversation_state')
    .select('current_stage, captured_data')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  return data ?? { current_stage: 'primeiro_contato' as string, captured_data: {} as Record<string, unknown> }
}

async function saveConversationState(tenantId: string, phone: string, stage: string, capturedData: Record<string, unknown>) {
  const admin = createAdminClient()
  await admin.from('conversation_state').upsert(
    { tenant_id: tenantId, contact_phone: phone, current_stage: stage, captured_data: capturedData, updated_at: new Date().toISOString() },
    { onConflict: 'tenant_id,contact_phone' }
  )
}

// Decide, via Claude API, se a conversa avança de estágio e o que capturar
// (ex: nome, queixa) a partir da última mensagem do paciente.
async function decideNextStage(
  currentStage: string,
  incomingText: string,
  capturedData: Record<string, unknown>
): Promise<{ nextStage: string; capturedData: Record<string, unknown> }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { nextStage: currentStage, capturedData }

  const currentIndex = STAGES.indexOf(currentStage as Stage)
  const stagesList = STAGES.join(', ')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system:
        `Você decide o próximo estágio de uma conversa de atendimento de clínica. ` +
        `Estágios possíveis, em ordem: ${stagesList}. ` +
        `Estágio atual: ${currentStage}. ` +
        `Dados já capturados: ${JSON.stringify(capturedData)}. ` +
        `Responda SOMENTE um JSON válido no formato {"next_stage": "...", "captured_data": {...}}. ` +
        `Avance de estágio só quando a resposta do paciente indicar que o assunto do estágio atual foi resolvido. ` +
        `Nunca invente estágio fora da lista.`,
      messages: [{ role: 'user', content: incomingText }],
    }),
  })

  if (!res.ok) return { nextStage: currentStage, capturedData }

  const data = (await res.json()) as { content: { type: string; text?: string }[] }
  const text = data.content.find((b) => b.type === 'text')?.text ?? ''

  try {
    const parsed = JSON.parse(text) as { next_stage: string; captured_data: Record<string, unknown> }
    const nextStage = STAGES.includes(parsed.next_stage as Stage) ? parsed.next_stage : currentStage
    const currentIdxSafe = currentIndex === -1 ? 0 : currentIndex
    const nextIdx = STAGES.indexOf(nextStage as Stage)
    // Nunca deixa a IA voltar estágio nem pular mais de um por vez.
    const safeStage = nextIdx > currentIdxSafe ? STAGES[currentIdxSafe + 1] : currentStage
    return { nextStage: safeStage, capturedData: { ...capturedData, ...parsed.captured_data } }
  } catch {
    return { nextStage: currentStage, capturedData }
  }
}

// Retorna o texto de resposta pra enviar, ou null se o motor não puder
// rodar (sem API key) ou a conversa já tiver chegado ao fim do fluxo.
export async function getBotReply(tenant: TenantInfo, phone: string, incomingText: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const state = await getConversationState(tenant.id, phone)
  const { nextStage, capturedData } = await decideNextStage(state.current_stage, incomingText, state.captured_data as Record<string, unknown>)

  await saveConversationState(tenant.id, phone, nextStage, capturedData)

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

  const context = {
    nome_clinica: tenant.name,
    endereco: tenant.address ?? '',
    nome_paciente: (capturedData.nome as string) ?? '',
    nome_profissional: firstProfessional?.name ?? '',
    link_agendamento: linkAgendamento,
  }

  const DEFAULTS: Record<Stage, string> = {
    primeiro_contato: `Olá! Bem-vindo(a) à ${tenant.name}. Como podemos te ajudar hoje?`,
    pergunta_queixa: 'Pra te atender melhor, me conta rapidinho o que você está sentindo ou o que gostaria de resolver?',
    explicacao_processo: 'Nosso processo é simples: avaliação inicial, diagnóstico e plano de tratamento. Posso te passar os horários disponíveis?',
    valor_e_horarios: `Atendemos em ${tenant.address ?? 'nosso endereço'}.`,
    confirmacao_horario: 'Perfeito! Vou te mandar o link pra você escolher o melhor horário.',
    envio_link_agendamento: linkAgendamento
      ? `Aqui está o link pra você agendar direto no horário que preferir: ${linkAgendamento}`
      : 'Entre em contato com a recepção pra agendar seu horário.',
  }

  return resolveTemplate(tenant.id, nextStage, context, DEFAULTS[nextStage as Stage])
}
