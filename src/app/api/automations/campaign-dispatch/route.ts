// Chamado pelo n8n (cron a cada 10min) — dispara em lotes pequenos pra não
// levantar suspeita de spam em instância Baileys não-oficial (rate limit
// conservador: 20 por execução, ver spec de campanhas de reengajamento).
// Varre todos os tenants de uma vez (service role, ignora RLS de propósito),
// igual ao padrão do budget-followup.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

const BATCH_SIZE = 20

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()

  const { data: pending } = await admin
    .from('campaign_recipients')
    .select('id, phone, message, campaign_id, campaigns(tenant_id, tenants(evolution_base_url, evolution_api_key, evolution_instance_name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  const results: { id: string; sent: boolean; error?: string }[] = []

  for (const recipient of pending ?? []) {
    const campaign = recipient.campaigns as unknown as {
      tenant_id: string
      tenants: {
        evolution_base_url: string | null
        evolution_api_key: string | null
        evolution_instance_name: string | null
      } | null
    } | null
    const tenant = campaign?.tenants

    if (!tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      await admin
        .from('campaign_recipients')
        .update({ status: 'failed', error: 'WhatsApp não configurado pro tenant.' })
        .eq('id', recipient.id)
      results.push({ id: recipient.id, sent: false, error: 'WhatsApp não configurado.' })
      continue
    }

    if (dryRun) {
      results.push({ id: recipient.id, sent: false, error: 'dry-run' })
      continue
    }

    try {
      await sendWhatsAppText(
        {
          baseUrl: tenant.evolution_base_url,
          apiKey: tenant.evolution_api_key,
          instanceName: tenant.evolution_instance_name,
        },
        recipient.phone,
        recipient.message
      )
      await admin
        .from('campaign_recipients')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', recipient.id)
      results.push({ id: recipient.id, sent: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro desconhecido.'
      await admin.from('campaign_recipients').update({ status: 'failed', error: message }).eq('id', recipient.id)
      results.push({ id: recipient.id, sent: false, error: message })
    }
  }

  return NextResponse.json({ results })
}
