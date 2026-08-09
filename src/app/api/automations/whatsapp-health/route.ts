// Chamado pelo n8n (cron periódico) — nunca pelo frontend. Varre todos os
// tenants com instância Evolution configurada, confere o estado real da
// conexão e avisa por WhatsApp (relay por qualquer instância que esteja
// aberta) se algum estiver caído. Objetivo: descobrir a desconexão em
// minutos, não quando o cliente reclamar.
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
    .select('id, name, evolution_instance_name')
    .not('evolution_instance_name', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const down: { id: string; name: string; state: string }[] = []
  let healthyInstanceName: string | null = null

  for (const tenant of tenants ?? []) {
    if (!tenant.evolution_instance_name) continue
    try {
      const state = await getConnectionState(tenant.evolution_instance_name)
      if (state === 'open') {
        if (!healthyInstanceName) healthyInstanceName = tenant.evolution_instance_name
      } else {
        down.push({ id: tenant.id, name: tenant.name, state })
      }
    } catch {
      down.push({ id: tenant.id, name: tenant.name, state: 'erro' })
    }
  }

  let alertSent = false
  if (down.length > 0 && healthyInstanceName) {
    const message = `⚠️ WhatsApp desconectado:\n${down.map((d) => `- ${d.name} (${d.state})`).join('\n')}`
    try {
      await sendWhatsAppText(
        {
          baseUrl: process.env.EVOLUTION_BASE_URL!,
          apiKey: process.env.EVOLUTION_API_KEY!,
          instanceName: healthyInstanceName,
        },
        ALERT_PHONE,
        message
      )
      alertSent = true
    } catch {
      // Sem instância saudável pra relay ou falha no envio — down list ainda
      // fica disponível na resposta pra quem chamou (log do n8n).
    }
  }

  return NextResponse.json({ checked: tenants?.length ?? 0, down, alertSent })
}
