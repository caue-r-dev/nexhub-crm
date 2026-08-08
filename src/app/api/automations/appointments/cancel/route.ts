// Chamado pelo n8n quando o paciente clica "Cancelar" no botão de resposta
// rápida do WhatsApp, ou pelo próprio cron de lembretes quando ninguém
// confirma até a janela de 2h antes da consulta.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

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
      'id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name)'
    )
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appt) {
    return NextResponse.json({ error: fetchError?.message ?? 'Agendamento não encontrado.' }, { status: 404 })
  }

  const { error: updateError } = await admin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const client = appt.clients as unknown as { name: string; phone: string | null } | null
  const tenant = appt.tenants as unknown as {
    name: string
    evolution_base_url: string | null
    evolution_api_key: string | null
    evolution_instance_name: string | null
  } | null

  if (client?.phone && tenant?.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    try {
      await sendWhatsAppText(
        {
          baseUrl: tenant.evolution_base_url,
          apiKey: tenant.evolution_api_key,
          instanceName: tenant.evolution_instance_name,
        },
        client.phone,
        `Sua consulta na ${tenant.name} foi cancelada. Se quiser remarcar, fale com a gente.`
      )
    } catch {
      // Status já foi atualizado — falha só no aviso não deve quebrar a
      // automação nem impedir o cancelamento de valer.
    }
  }

  return NextResponse.json({ ok: true })
}
