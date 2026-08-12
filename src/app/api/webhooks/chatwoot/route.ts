// Recebe eventos do Chatwoot (message_created) pra todos os tenants — um
// único endpoint, o tenant é resolvido pelo account_id que vem no payload
// (cada tenant tem sua própria Account no Chatwoot). Interpreta resposta
// livre do paciente ("sim"/"não") pra confirmar ou cancelar a consulta
// pendente mais próxima — não dá pra usar botão de resposta rápida porque
// WhatsApp não entrega esse tipo de mensagem em número não-oficial/Baileys
// (confirmado testando ao vivo: API aceita, mensagem nunca chega no
// aparelho).
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmAppointment, cancelAppointment, findPendingAppointmentByPhone } from '@/lib/appointment-automation'
import { getBotReply, markEscalatedIfHumanSent } from '@/lib/bot-engine'
import { sendWhatsAppText } from '@/lib/evolution'
import { isExistingClient } from '@/lib/existing-client'

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// Botão de resposta rápida não entrega em número não-oficial (Baileys) —
// só resta ampliar a lista de variações de texto livre que o paciente pode
// digitar, cobrindo gírias/abreviações comuns em vez de exigir "sim"/"não"
// exatos.
const CONFIRM_WORDS = [
  'sim',
  'confirmo',
  'confirmar',
  'confirmado',
  'ok',
  'okay',
  'blz',
  'beleza',
  'pode',
  'claro',
  'certo',
  'isso',
  'positivo',
  'presente',
  'comparecerei',
  'comparecer',
  'irei',
  'vou',
  'fechado',
  'combinado',
  'perfeito',
  '👍',
  '✅',
]
const CANCEL_WORDS = [
  'nao',
  'cancelo',
  'cancelar',
  'cancelado',
  'desmarcar',
  'desmarco',
  'negativo',
  'impossivel',
  'infelizmente',
  '👎',
  '❌',
]

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ ok: true })

  if (payload.event !== 'message_created') {
    return NextResponse.json({ ok: true })
  }

  const accountId: number | undefined = payload.account?.id ?? payload.conversation?.account_id
  const phone: string | undefined = payload.conversation?.meta?.sender?.phone_number ?? payload.sender?.phone_number
  const content: string | undefined = payload.content

  if (!accountId || !phone || !content) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select(
      'id, name, address, business_hours, slug, evolution_base_url, evolution_api_key, evolution_instance_name, bot_enabled, bot_context_notes, public_booking_enabled'
    )
    .eq('chatwoot_account_id', accountId)
    .single()
  if (!tenant) return NextResponse.json({ ok: true })

  // "outgoing" cobre tanto o reply automático do bot quanto o dono
  // digitando direto no celular (não existe webhook nativo do WhatsApp
  // que diferencie os dois) — só serve pra detectar assunção manual.
  if (payload.message_type === 'outgoing') {
    await markEscalatedIfHumanSent(tenant.id, phone, content)
    return NextResponse.json({ ok: true })
  }

  if (payload.message_type !== 'incoming') return NextResponse.json({ ok: true })

  const appointmentId = await findPendingAppointmentByPhone(tenant.id, phone)

  if (appointmentId) {
    const words = normalize(content).split(/\s+/)
    const isConfirm = words.some((w) => CONFIRM_WORDS.includes(w))
    const isCancel = words.some((w) => CANCEL_WORDS.includes(w))

    if (isConfirm && !isCancel) {
      await confirmAppointment(appointmentId)
      return NextResponse.json({ ok: true })
    } else if (isCancel && !isConfirm) {
      await cancelAppointment(appointmentId)
      return NextResponse.json({ ok: true })
    }
    // Resposta ambígua com consulta pendente — ignora, deixa pendente. Não
    // manda mensagem de "não entendi" pra evitar loop de bot chato numa
    // conversa que também é usada por humano (dentista pode estar no chat).
    return NextResponse.json({ ok: true })
  }

  // Sem consulta pendente pra confirmar/cancelar — passa pro bot de
  // primeiro contato (fluxo linear por template; a IA só humaniza o texto
  // de cada estágio, não decide o fluxo). Quem já é cliente cadastrado não
  // recebe o discurso de "lead novo" — mensagem chega no Chatwoot normal,
  // atendimento fica por conta de humano.
  if (tenant.bot_enabled && tenant.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    try {
      const alreadyClient = await isExistingClient(tenant.id, phone)
      const reply = alreadyClient ? null : await getBotReply(tenant, phone, content)
      if (reply) {
        await sendWhatsAppText(
          { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
          phone,
          reply
        )
      }
    } catch {
      // Falha do bot não deve derrubar o webhook — mensagem original do
      // paciente já chegou no Chatwoot normalmente, humano pode assumir.
    }
  }

  return NextResponse.json({ ok: true })
}
