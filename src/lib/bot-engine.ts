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
  business_hours: BusinessHours | null
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
    primeiro_contato: `Olá! Bem-vindo(a) à ${tenant.name}. Como podemos te ajudar hoje?`,
    pergunta_queixa: 'Pra te atender melhor, me conta rapidinho o que você está sentindo ou o que gostaria de resolver?',
    explicacao_processo: 'Nosso processo é simples: avaliação inicial, diagnóstico e plano de tratamento. Posso te passar os horários disponíveis?',
    valor_e_horarios: `${valorConsulta ? `O valor da avaliação é ${valorConsulta}. ` : ''}Atendemos${horarioAtendimento ? ` ${horarioAtendimento}` : ''}${tenant.address ? `, na ${tenant.address}` : ''}.`,
    confirmacao_horario: 'Perfeito! Vou te mandar o link pra você escolher o melhor horário.',
    envio_link_agendamento: linkAgendamento
      ? `Aqui está o link pra você agendar direto no horário que preferir: ${linkAgendamento}`
      : 'Entre em contato com a recepção pra agendar seu horário.',
  }

  return resolveTemplate(tenant.id, nextStage, context, DEFAULTS[nextStage])
}
