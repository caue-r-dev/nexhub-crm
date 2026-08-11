// Chamado pelo n8n (cron, sugestão a cada 2-3min) — fecha o loop de
// detecção+correção do bug de "socket fantasma" sem depender de humano
// perceber. sendWhatsAppText/sendWhatsAppImage já registram um incidente em
// `evolution_incidents` toda vez que um envio real falha com "Connection
// Closed" (a assinatura exata desse bug). Aqui: se existe incidente não
// resolvido, reinicia o container e marca tudo como resolvido — cooldown de
// 2min pra não reiniciar em loop se vários incidentes chegarem juntos
// durante o próprio boot da instância.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

const ALERT_PHONE = '15981504416'
const COOLDOWN_MS = 2 * 60_000

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: unresolved } = await admin
    .from('evolution_incidents')
    .select('id, instance_name, error_message, created_at')
    .is('resolved_at', null)
    .order('created_at', { ascending: true })

  if (!unresolved || unresolved.length === 0) {
    return NextResponse.json({ ok: true, restarted: false, reason: 'sem incidentes' })
  }

  const { data: lastResolved } = await admin
    .from('evolution_incidents')
    .select('resolved_at')
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastResolved?.resolved_at && Date.now() - new Date(lastResolved.resolved_at).getTime() < COOLDOWN_MS) {
    return NextResponse.json({ ok: true, restarted: false, reason: 'cooldown ativo' })
  }

  const url = process.env.RESTART_EVOLUTION_URL
  const token = process.env.RESTART_EVOLUTION_TOKEN
  if (!url || !token) {
    return NextResponse.json({ ok: false, error: 'RESTART_EVOLUTION_URL/TOKEN não configurados.' }, { status: 500 })
  }

  const instances = [...new Set(unresolved.map((i) => i.instance_name))]

  try {
    const res = await fetch(url, { method: 'POST', headers: { 'X-Restart-Token': token } })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Restart falhou: ${await res.text()}` }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Erro ao chamar restart.' }, { status: 500 })
  }

  await admin
    .from('evolution_incidents')
    .update({ resolved_at: new Date().toISOString() })
    .in(
      'id',
      unresolved.map((i) => i.id)
    )

  // Alerta best-effort — se o próprio envio falhar (container ainda de pé
  // no meio do reboot), não é motivo pra reportar a rota como erro, o
  // restart em si já foi feito com sucesso.
  try {
    const evolutionBaseUrl = process.env.EVOLUTION_BASE_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    if (evolutionBaseUrl && evolutionApiKey) {
      await sendWhatsAppText(
        { baseUrl: evolutionBaseUrl, apiKey: evolutionApiKey, instanceName: instances[0] },
        ALERT_PHONE,
        `🔧 Auto-restart executado: bug de socket fantasma detectado em ${instances.join(', ')} (${unresolved.length} incidente(s)). Corrigido automaticamente.`
      )
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, restarted: true, instances, incidentsResolved: unresolved.length })
}
