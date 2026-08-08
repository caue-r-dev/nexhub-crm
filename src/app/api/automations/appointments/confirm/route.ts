// Chamado pelo n8n quando o paciente clica "Confirmar" no botão de resposta
// rápida do WhatsApp (a mensagem com o botão é responsabilidade do próprio
// fluxo n8n — esse endpoint só processa o resultado). Marca o agendamento
// como confirmado e, se o tenant tiver chave Pix + valor de sinal padrão
// configurados, gera o QR e manda de volta pro paciente na hora.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText, sendWhatsAppImage } from '@/lib/evolution'
import { generatePixQr } from '@/lib/pix'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const appointmentId = body?.appointmentId
  if (!appointmentId || typeof appointmentId !== 'string') {
    return NextResponse.json({ error: 'appointmentId é obrigatório.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: appt, error: fetchError } = await admin
    .from('appointments')
    .select(
      'id, deposit_amount, client_id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name, pix_key, pix_receiver_name, default_deposit_amount)'
    )
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appt) {
    return NextResponse.json({ error: fetchError?.message ?? 'Agendamento não encontrado.' }, { status: 404 })
  }

  const client = appt.clients as unknown as { name: string; phone: string | null } | null
  const tenant = appt.tenants as unknown as {
    name: string
    evolution_base_url: string | null
    evolution_api_key: string | null
    evolution_instance_name: string | null
    pix_key: string | null
    pix_receiver_name: string | null
    default_deposit_amount: number | null
  } | null

  const depositAmount = appt.deposit_amount ?? tenant?.default_deposit_amount ?? null

  const { error: updateError } = await admin
    .from('appointments')
    .update({
      status: 'confirmed',
      ...(appt.deposit_amount == null && depositAmount != null
        ? { deposit_amount: depositAmount, payment_status: 'aguardando' }
        : {}),
    })
    .eq('id', appointmentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
    return NextResponse.json({ ok: true, pixSent: false, reason: 'Sem telefone ou WhatsApp não configurado.' })
  }

  const evolutionConfig = {
    baseUrl: tenant.evolution_base_url,
    apiKey: tenant.evolution_api_key,
    instanceName: tenant.evolution_instance_name,
  }

  try {
    await sendWhatsAppText(evolutionConfig, client.phone, `Consulta confirmada! Te esperamos na ${tenant.name}.`)
  } catch (e) {
    return NextResponse.json(
      { ok: true, pixSent: false, error: e instanceof Error ? e.message : 'Erro ao enviar confirmação.' },
      { status: 207 }
    )
  }

  if (!tenant.pix_key || !depositAmount) {
    return NextResponse.json({ ok: true, pixSent: false, reason: 'Sem chave Pix ou valor de sinal configurado.' })
  }

  const pix = await generatePixQr({
    pixKey: tenant.pix_key,
    receiverName: tenant.pix_receiver_name ?? tenant.name,
    amount: depositAmount,
    txid: appointmentId,
  })

  if ('error' in pix) {
    return NextResponse.json({ ok: true, pixSent: false, error: pix.error })
  }

  try {
    await sendWhatsAppImage(
      evolutionConfig,
      client.phone,
      pix.qrImage,
      `Pix do sinal (R$ ${depositAmount.toFixed(2)}). Copia e cola:\n${pix.brCode}`
    )
  } catch (e) {
    return NextResponse.json({ ok: true, pixSent: false, error: e instanceof Error ? e.message : 'Erro ao enviar Pix.' })
  }

  return NextResponse.json({ ok: true, pixSent: true })
}
