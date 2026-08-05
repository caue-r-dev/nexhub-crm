// Chamado pelo n8n (cron a cada ~15min) — nunca pelo frontend. Varre todos os
// tenants (service role, ignora RLS de propósito) procurando consultas na
// janela de 24h ou 2h antes que ainda não tiveram lembrete disparado, manda
// via Evolution API direto (não depende de conversa existente no Chatwoot) e
// marca o lembrete como enviado pra não duplicar na próxima execução.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

const BR_TZ = 'America/Sao_Paulo'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { timeZone: BR_TZ })
  const time = d.toLocaleTimeString('pt-BR', { timeZone: BR_TZ, hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

function buildMessage(window: '24h' | '2h', clientName: string, tenantName: string, iso: string) {
  const { date, time } = formatDateTime(iso)
  const firstName = clientName.split(' ')[0]
  if (window === '24h') {
    return `Olá ${firstName}! Passando pra confirmar sua consulta amanhã (${date} às ${time}) na ${tenantName}. Podemos confirmar sua presença?`
  }
  return `Olá ${firstName}! Só lembrando que sua consulta é hoje às ${time} na ${tenantName}. Te esperamos!`
}

type WindowConfig = { label: '24h' | '2h'; column: 'reminder_24h_sent_at' | 'reminder_2h_sent_at'; fromHours: number; toHours: number }

const WINDOWS: WindowConfig[] = [
  { label: '24h', column: 'reminder_24h_sent_at', fromHours: 23.5, toHours: 24.5 },
  { label: '2h', column: 'reminder_2h_sent_at', fromHours: 1.75, toHours: 2.25 },
]

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()
  const now = Date.now()
  const results: { window: string; appointmentId: string; client: string; sent: boolean; error?: string }[] = []

  for (const w of WINDOWS) {
    const from = new Date(now + w.fromHours * 3600_000).toISOString()
    const to = new Date(now + w.toHours * 3600_000).toISOString()

    const { data: appointments, error } = await admin
      .from('appointments')
      .select('id, datetime, tenant_id, client_id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name)')
      .eq('type', 'consulta')
      .in('status', ['pending', 'confirmed'])
      .not('client_id', 'is', null)
      .is(w.column, null)
      .gte('datetime', from)
      .lt('datetime', to)

    if (error) {
      results.push({ window: w.label, appointmentId: '-', client: '-', sent: false, error: error.message })
      continue
    }

    for (const appt of appointments ?? []) {
      const client = appt.clients as unknown as { name: string; phone: string | null } | null
      const tenant = appt.tenants as unknown as {
        name: string
        evolution_base_url: string | null
        evolution_api_key: string | null
        evolution_instance_name: string | null
      } | null

      if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
        results.push({
          window: w.label,
          appointmentId: appt.id,
          client: client?.name ?? '—',
          sent: false,
          error: 'Sem telefone ou WhatsApp não configurado pro tenant.',
        })
        continue
      }

      const message = buildMessage(w.label, client.name, tenant.name, appt.datetime)

      if (dryRun) {
        results.push({ window: w.label, appointmentId: appt.id, client: client.name, sent: false, error: 'dry-run' })
        continue
      }

      try {
        await sendWhatsAppText(
          {
            baseUrl: tenant.evolution_base_url,
            apiKey: tenant.evolution_api_key,
            instanceName: tenant.evolution_instance_name,
          },
          client.phone,
          message
        )
        const sentAtPatch =
          w.column === 'reminder_24h_sent_at'
            ? { reminder_24h_sent_at: new Date().toISOString() }
            : { reminder_2h_sent_at: new Date().toISOString() }
        await admin.from('appointments').update(sentAtPatch).eq('id', appt.id)
        results.push({ window: w.label, appointmentId: appt.id, client: client.name, sent: true })
      } catch (e) {
        results.push({
          window: w.label,
          appointmentId: appt.id,
          client: client.name,
          sent: false,
          error: e instanceof Error ? e.message : 'Erro desconhecido.',
        })
      }
    }
  }

  return NextResponse.json({ results })
}
