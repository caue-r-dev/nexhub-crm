// Chamado pelo n8n (cron), mesmo padrão de /api/automations/reminders.
// Dois gatilhos:
// - atraso: passou 30-90min do horário e o paciente ainda não foi
//   marcado como confirmado/atendido — pode só estar atrasado.
// - falta_sem_remarcar: passou 24-25h do horário, status ainda pending/
//   confirmed/no_show, e o cliente não tem nenhum agendamento futuro —
//   sinal de que perdeu a consulta e não remarcou sozinho.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'
import { resolveTemplate } from '@/lib/message-templates'

const BR_TZ = 'America/Sao_Paulo'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: BR_TZ, hour: '2-digit', minute: '2-digit' })
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()
  const now = Date.now()
  const results: { kind: string; appointmentId: string; client: string; sent: boolean; error?: string }[] = []

  // --- atraso: 30-90min após o horário, ainda pending/confirmed ---
  const atrasoFrom = new Date(now - 90 * 60_000).toISOString()
  const atrasoTo = new Date(now - 30 * 60_000).toISOString()

  const { data: atrasados } = await admin
    .from('appointments')
    .select(
      'id, tenant_id, datetime, client_id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name)'
    )
    .eq('type', 'consulta')
    .in('status', ['pending', 'confirmed'])
    .not('client_id', 'is', null)
    .is('followup_atraso_sent_at', null)
    .gte('datetime', atrasoFrom)
    .lt('datetime', atrasoTo)

  for (const appt of atrasados ?? []) {
    const client = appt.clients as unknown as { name: string; phone: string | null } | null
    const tenant = appt.tenants as unknown as {
      name: string
      evolution_base_url: string | null
      evolution_api_key: string | null
      evolution_instance_name: string | null
    } | null

    if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      results.push({ kind: 'atraso', appointmentId: appt.id, client: client?.name ?? '—', sent: false, error: 'Sem WhatsApp configurado.' })
      continue
    }

    if (dryRun) {
      results.push({ kind: 'atraso', appointmentId: appt.id, client: client.name, sent: false, error: 'dry-run' })
      continue
    }

    try {
      const message = await resolveTemplate(
        appt.tenant_id,
        'followup_atraso',
        { nome_paciente: client.name.split(' ')[0], horario_consulta: formatTime(appt.datetime), nome_clinica: tenant.name },
        `Olá ${client.name.split(' ')[0]}! Sua consulta era às ${formatTime(appt.datetime)} e ainda não te vimos por aqui. Está tudo bem? Ainda vem?`
      )
      await sendWhatsAppText(
        { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
        client.phone,
        message
      )
      await admin.from('appointments').update({ followup_atraso_sent_at: new Date().toISOString() }).eq('id', appt.id)
      results.push({ kind: 'atraso', appointmentId: appt.id, client: client.name, sent: true })
    } catch (e) {
      results.push({ kind: 'atraso', appointmentId: appt.id, client: client.name, sent: false, error: e instanceof Error ? e.message : 'Erro.' })
    }
  }

  // --- falta_sem_remarcar: 24-25h após o horário, sem remarcação ---
  const faltaFrom = new Date(now - 25 * 3600_000).toISOString()
  const faltaTo = new Date(now - 24 * 3600_000).toISOString()

  const { data: faltosos } = await admin
    .from('appointments')
    .select(
      'id, tenant_id, datetime, client_id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name)'
    )
    .eq('type', 'consulta')
    .in('status', ['pending', 'confirmed', 'no_show'])
    .not('client_id', 'is', null)
    .is('followup_falta_sent_at', null)
    .gte('datetime', faltaFrom)
    .lt('datetime', faltaTo)

  for (const appt of faltosos ?? []) {
    const client = appt.clients as unknown as { name: string; phone: string | null } | null
    const tenant = appt.tenants as unknown as {
      name: string
      evolution_base_url: string | null
      evolution_api_key: string | null
      evolution_instance_name: string | null
    } | null

    if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      results.push({ kind: 'falta', appointmentId: appt.id, client: client?.name ?? '—', sent: false, error: 'Sem WhatsApp configurado.' })
      continue
    }

    const { data: futuros } = await admin
      .from('appointments')
      .select('id')
      .eq('client_id', appt.client_id)
      .in('status', ['pending', 'confirmed'])
      .gt('datetime', new Date().toISOString())
      .limit(1)

    if (futuros && futuros.length > 0) {
      results.push({ kind: 'falta', appointmentId: appt.id, client: client.name, sent: false, error: 'Já tem consulta futura marcada.' })
      continue
    }

    if (dryRun) {
      results.push({ kind: 'falta', appointmentId: appt.id, client: client.name, sent: false, error: 'dry-run' })
      continue
    }

    try {
      const message = await resolveTemplate(
        appt.tenant_id,
        'followup_falta_sem_remarcar',
        { nome_paciente: client.name.split(' ')[0], nome_clinica: tenant.name },
        `Olá ${client.name.split(' ')[0]}! Sentimos sua falta na consulta e ainda não remarcamos. Quer escolher um novo horário?`
      )
      await sendWhatsAppText(
        { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
        client.phone,
        message
      )
      await admin.from('appointments').update({ followup_falta_sent_at: new Date().toISOString() }).eq('id', appt.id)
      results.push({ kind: 'falta', appointmentId: appt.id, client: client.name, sent: true })
    } catch (e) {
      results.push({ kind: 'falta', appointmentId: appt.id, client: client.name, sent: false, error: e instanceof Error ? e.message : 'Erro.' })
    }
  }

  return NextResponse.json({ results })
}
