// Motor do bot de primeiro contato — conduz a conversa até o envio do link
// de agendamento público (já existente, não recria coleta de dados via
// chat). Chamado pelo webhook do Chatwoot quando a mensagem recebida não é
// resposta sim/não a uma confirmação pendente.
//
// Sem IA por enquanto (decisão do usuário — fluxo é linear e previsível,
// não precisa de LLM pra classificar estágio): qualquer mensagem recebida
// avança um estágio. Pode plugar Claude/outro LLM aqui depois se o fluxo
// precisar ramificar de verdade.
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

// Retorna o texto de resposta pra enviar, ou null se a conversa já tiver
// chegado ao fim do fluxo (link já enviado — não fica insistindo).
export async function getBotReply(tenant: TenantInfo, phone: string, incomingText: string): Promise<string | null> {
  const state = await getConversationState(tenant.id, phone)
  const currentIndex = STAGES.indexOf(state.current_stage as Stage)
  const currentIdxSafe = currentIndex === -1 ? 0 : currentIndex

  if (currentIdxSafe >= STAGES.length - 1) return null

  const nextStage = STAGES[currentIdxSafe + 1]
  const capturedData = state.captured_data as Record<string, unknown>

  // Primeira mensagem livre do paciente (estágio pergunta_queixa) é
  // guardada como queixa capturada, pra reaproveitar em templates futuros.
  const updatedCapturedData =
    state.current_stage === 'pergunta_queixa' ? { ...capturedData, queixa: incomingText } : capturedData

  await saveConversationState(tenant.id, phone, nextStage, updatedCapturedData)

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

  return resolveTemplate(tenant.id, nextStage, context, DEFAULTS[nextStage])
}
