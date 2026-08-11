// Chamado pelo n8n (cron periódico) — nunca pelo frontend. Varre todos os
// tenants com instância Evolution configurada, confere o estado real da
// conexão e avisa por WhatsApp (relay por qualquer instância que esteja
// aberta) se algum estiver caído. Objetivo: descobrir a desconexão em
// minutos, não quando o cliente reclamar.
//
// Edge-triggered: só avisa quando o estado MUDA de aberto pra caído (ou
// vice-versa), nunca repete o mesmo alerta a cada execução do cron —
// antes mandava a mensagem de novo toda vez que rodava enquanto o tenant
// continuasse desconectado, virou spam no WhatsApp do admin.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConnectionState } from '@/lib/evolution-admin'
import { sendWhatsAppText } from '@/lib/evolution'

const ALERT_PHONE = '15981504416'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: tenants, error } = await admin
    .from('tenants')
    .select('id, name, evolution_instance_name, last_whatsapp_state')
    .not('evolution_instance_name', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const down: { id: string; name: string; state: string }[] = []
  const recovered: { id: string; name: string }[] = []
  let healthyInstanceName: string | null = null

  for (const tenant of tenants ?? []) {
    if (!tenant.evolution_instance_name) continue

    let state: string
    try {
      state = await getConnectionState(tenant.evolution_instance_name)
    } catch {
      state = 'erro'
    }

    if (state === 'open') {
      if (!healthyInstanceName) healthyInstanceName = tenant.evolution_instance_name
      if (tenant.last_whatsapp_state && tenant.last_whatsapp_state !== 'open') {
        recovered.push({ id: tenant.id, name: tenant.name })
      }
    } else if (tenant.last_whatsapp_state === 'open' || tenant.last_whatsapp_state === null) {
      // Só entra na lista de alerta na TRANSIÇÃO pra caído — se já estava
      // caído no ciclo anterior, não repete.
      down.push({ id: tenant.id, name: tenant.name, state })
    }

    if (state !== tenant.last_whatsapp_state) {
      await admin.from('tenants').update({ last_whatsapp_state: state }).eq('id', tenant.id)
    }
  }

  let alertSent = false
  if ((down.length > 0 || recovered.length > 0) && healthyInstanceName) {
    const lines: string[] = []
    if (down.length > 0) lines.push(`⚠️ Caiu agora:\n${down.map((d) => `- ${d.name} (${d.state})`).join('\n')}`)
    if (recovered.length > 0) lines.push(`✅ Voltou:\n${recovered.map((r) => `- ${r.name}`).join('\n')}`)
    const message = lines.join('\n\n')
    try {
      await sendWhatsAppText(
        { baseUrl: process.env.EVOLUTION_BASE_URL!, apiKey: process.env.EVOLUTION_API_KEY!, instanceName: healthyInstanceName },
        ALERT_PHONE,
        message
      )
      alertSent = true
    } catch {
      // Sem instância saudável pra relay ou falha no envio — down list ainda
      // fica disponível na resposta pra quem chamou (log do n8n).
    }
  }

  return NextResponse.json({ checked: tenants?.length ?? 0, down, recovered, alertSent })
}
