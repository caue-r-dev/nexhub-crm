// Chamado pelo n8n (cron periódico) — nunca pelo frontend. Varre todos os
// tenants com instância Evolution configurada, confere o estado real da
// conexão e avisa por WhatsApp se algum estiver caído. Objetivo: descobrir
// a desconexão em minutos, não quando o cliente reclamar.
//
// Edge-triggered: só avisa quando o estado MUDA de aberto pra caído (ou
// vice-versa), nunca repete o mesmo alerta a cada execução do cron —
// antes mandava a mensagem de novo toda vez que rodava enquanto o tenant
// continuasse desconectado, virou spam no WhatsApp do admin.
//
// O relay do alerta é SEMPRE a instância pessoal do admin (nunca uma
// instância de cliente real) — incidente confirmado em produção: o alerta
// pegava "qualquer instância aberta" pra relay e mandou aviso interno pelo
// WhatsApp de uma clínica cliente pro celular do admin. Se a instância do
// admin não estiver aberta, o alerta simplesmente não sai por WhatsApp
// (fica só no retorno da rota pro log do n8n) — nunca cai pra fallback de
// cliente.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConnectionState } from '@/lib/evolution-admin'
import { sendWhatsAppText } from '@/lib/evolution'

const ALERT_PHONE = '15981504416'
const ALERT_RELAY_INSTANCE_NAME = process.env.ALERT_RELAY_INSTANCE_NAME || 'nexhub-006c5168'

// Instância nova (ou sessão que perdeu o par) fica em "connecting" até
// alguém escanear o QR — isso é normal e não deve virar restart automático,
// senão qualquer tenant demorando pra escanear derruba clientes reais que
// estão bem (restart é global, ver evolution-restart.ts). Só depois de
// preso por muito tempo SEM nenhuma transição pra "open" é que trata como o
// bug de socket fantasma (mesma assinatura de sempre) e deixa o self-heal
// reiniciar sozinho — folga generosa de propósito pra nunca incomodar
// atendimento real por impaciência de QR.
const CONNECTING_STUCK_THRESHOLD_MS = 20 * 60_000

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: tenants, error } = await admin
    .from('tenants')
    .select('id, name, evolution_instance_name, last_whatsapp_state, connecting_since')
    .not('evolution_instance_name', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const down: { id: string; name: string; state: string }[] = []
  const recovered: { id: string; name: string }[] = []
  const stuckConnecting: { id: string; name: string; instanceName: string; stuckSince: string }[] = []

  for (const tenant of tenants ?? []) {
    if (!tenant.evolution_instance_name) continue

    let state: string
    try {
      state = await getConnectionState(tenant.evolution_instance_name)
    } catch {
      state = 'erro'
    }

    if (state === 'open') {
      if (tenant.last_whatsapp_state && tenant.last_whatsapp_state !== 'open') {
        recovered.push({ id: tenant.id, name: tenant.name })
      }
      if (tenant.connecting_since) {
        await admin.from('tenants').update({ connecting_since: null }).eq('id', tenant.id)
      }
    } else if (tenant.last_whatsapp_state === 'open' || tenant.last_whatsapp_state === null) {
      // Só entra na lista de alerta na TRANSIÇÃO pra caído — se já estava
      // caído no ciclo anterior, não repete.
      down.push({ id: tenant.id, name: tenant.name, state })
    }

    if (state === 'connecting') {
      if (!tenant.connecting_since) {
        await admin.from('tenants').update({ connecting_since: new Date().toISOString() }).eq('id', tenant.id)
      } else if (Date.now() - new Date(tenant.connecting_since).getTime() > CONNECTING_STUCK_THRESHOLD_MS) {
        stuckConnecting.push({ id: tenant.id, name: tenant.name, instanceName: tenant.evolution_instance_name, stuckSince: tenant.connecting_since })
        // Reinicia o relógio já aqui — sem isso, cada execução do cron
        // enquanto o incidente ainda não foi processado pelo self-heal
        // insere um incidente novo pro mesmo travamento.
        await admin.from('tenants').update({ connecting_since: new Date().toISOString() }).eq('id', tenant.id)
      }
    } else if (tenant.connecting_since) {
      await admin.from('tenants').update({ connecting_since: null }).eq('id', tenant.id)
    }

    if (state !== tenant.last_whatsapp_state) {
      await admin.from('tenants').update({ last_whatsapp_state: state }).eq('id', tenant.id)
    }
  }

  for (const tenant of stuckConnecting) {
    await admin.from('evolution_incidents').insert({
      instance_name: tenant.instanceName,
      error_message: `connecting preso desde ${tenant.stuckSince} (>${CONNECTING_STUCK_THRESHOLD_MS / 60_000}min sem parear) - tenant ${tenant.name}`,
    })
  }

  let alertSent = false
  if (down.length > 0 || recovered.length > 0) {
    const lines: string[] = []
    if (down.length > 0) lines.push(`⚠️ Caiu agora:\n${down.map((d) => `- ${d.name} (${d.state})`).join('\n')}`)
    if (recovered.length > 0) lines.push(`✅ Voltou:\n${recovered.map((r) => `- ${r.name}`).join('\n')}`)
    const message = lines.join('\n\n')
    try {
      const relayState = await getConnectionState(ALERT_RELAY_INSTANCE_NAME)
      if (relayState === 'open') {
        await sendWhatsAppText(
          { baseUrl: process.env.EVOLUTION_BASE_URL!, apiKey: process.env.EVOLUTION_API_KEY!, instanceName: ALERT_RELAY_INSTANCE_NAME },
          ALERT_PHONE,
          message
        )
        alertSent = true
      }
    } catch {
      // Instância de relay do admin caída/inexistente ou falha no envio —
      // NUNCA cai pra instância de cliente como fallback. down list ainda
      // fica disponível na resposta pra quem chamou (log do n8n).
    }
  }

  return NextResponse.json({ checked: tenants?.length ?? 0, down, recovered, stuckConnecting, alertSent })
}
