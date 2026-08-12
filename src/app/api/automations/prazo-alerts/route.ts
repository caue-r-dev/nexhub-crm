// Chamado pelo n8n (cron 1x por dia) — alerta INTERNO (advogado/equipe, não
// cliente) quando um prazo processual está dentro da janela configurada
// (alerta_dias_antes). Usa o mesmo telefone de notificação já usado pra
// avisar de novo agendamento público — não manda nada pro cliente do
// processo, isso é fluxo separado (fora de escopo v1).
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()
  const today = new Date()

  const { data: prazos } = await admin
    .from('prazos')
    .select(
      'id, tipo_prazo, data_fatal, alerta_dias_antes, processos(tipo_acao, tenant_id, clients(name), tenants(name, notification_phone, evolution_base_url, evolution_api_key, evolution_instance_name))'
    )
    .eq('status', 'pendente')
    .is('alerta_enviado_at', null)

  const results: { id: string; sent: boolean; error?: string }[] = []

  for (const prazo of prazos ?? []) {
    const processo = prazo.processos as unknown as {
      tipo_acao: string | null
      clients: { name: string } | null
      tenants: {
        name: string
        notification_phone: string | null
        evolution_base_url: string | null
        evolution_api_key: string | null
        evolution_instance_name: string | null
      } | null
    } | null

    const tenant = processo?.tenants
    const client = processo?.clients

    const dataFatal = new Date(`${prazo.data_fatal}T00:00:00`)
    const daysUntil = Math.round((dataFatal.getTime() - today.getTime()) / 86400000)
    if (daysUntil > prazo.alerta_dias_antes) continue

    if (!tenant?.notification_phone || !tenant.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      results.push({ id: prazo.id, sent: false, error: 'Sem telefone de notificação ou WhatsApp não configurado.' })
      continue
    }

    const message = `Prazo se aproximando: "${prazo.tipo_prazo}" ${processo?.tipo_acao ? `(${processo.tipo_acao}) ` : ''}${client?.name ? `— cliente ${client.name} ` : ''}vence em ${new Date(`${prazo.data_fatal}T00:00:00`).toLocaleDateString('pt-BR')}.`

    if (dryRun) {
      results.push({ id: prazo.id, sent: false, error: 'dry-run' })
      continue
    }

    try {
      await sendWhatsAppText(
        { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
        tenant.notification_phone,
        message
      )
      await admin.from('prazos').update({ alerta_enviado_at: new Date().toISOString() }).eq('id', prazo.id)
      results.push({ id: prazo.id, sent: true })
    } catch (e) {
      results.push({ id: prazo.id, sent: false, error: e instanceof Error ? e.message : 'Erro.' })
    }
  }

  return NextResponse.json({ results })
}
