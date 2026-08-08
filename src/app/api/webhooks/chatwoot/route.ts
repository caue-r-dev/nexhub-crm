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

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const CONFIRM_WORDS = ['sim', 'confirmo', 'confirmar', 'ok', 'pode']
const CANCEL_WORDS = ['nao', 'cancelo', 'cancelar', 'desmarcar']

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null)
  if (!payload) return NextResponse.json({ ok: true })

  if (payload.event !== 'message_created' || payload.message_type !== 'incoming') {
    return NextResponse.json({ ok: true })
  }

  const accountId: number | undefined = payload.account?.id ?? payload.conversation?.account_id
  const phone: string | undefined = payload.conversation?.meta?.sender?.phone_number ?? payload.sender?.phone_number
  const content: string | undefined = payload.content

  if (!accountId || !phone || !content) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  const { data: tenant } = await admin.from('tenants').select('id').eq('chatwoot_account_id', accountId).single()
  if (!tenant) return NextResponse.json({ ok: true })

  const appointmentId = await findPendingAppointmentByPhone(tenant.id, phone)
  if (!appointmentId) return NextResponse.json({ ok: true })

  const words = normalize(content).split(/\s+/)
  const isConfirm = words.some((w) => CONFIRM_WORDS.includes(w))
  const isCancel = words.some((w) => CANCEL_WORDS.includes(w))

  if (isConfirm && !isCancel) {
    await confirmAppointment(appointmentId)
  } else if (isCancel && !isConfirm) {
    await cancelAppointment(appointmentId)
  }
  // Resposta ambígua ou sem palavra-chave — ignora, deixa pendente. Não
  // manda mensagem de "não entendi" pra evitar loop de bot chato numa
  // conversa que também é usada por humano (dentista pode estar no chat).

  return NextResponse.json({ ok: true })
}
