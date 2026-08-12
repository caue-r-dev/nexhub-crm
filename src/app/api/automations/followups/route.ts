// Chamado pelo n8n (cron), mesmo padrão de /api/automations/reminders.
// Dois gatilhos:
// - atraso: passou 30-90min do horário e o paciente ainda não foi
//   marcado como confirmado/atendido — pode só estar atrasado.
// - falta_sem_remarcar: status marcado como "Faltou" (no_show) manualmente
//   na agenda pela equipe, e o cliente não tem nenhum agendamento futuro
//   — não dispara sozinho só por tempo, depende de alguém confirmar a
//   falta de verdade (evita mandar mensagem de falta pra quem só atrasou
//   ou não teve o status atualizado ainda).
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
        `Olá! Aqui é a ${tenant.name}. Você está chegando? Ficamos preocupados quando não vemos o paciente no horário — está tudo bem?`
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

  // --- falta_sem_remarcar: status "Faltou" marcado na agenda, sem remarcação ---
  const { data: faltosos } = await admin
    .from('appointments')
    .select(
      'id, tenant_id, datetime, client_id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name)'
    )
    .eq('type', 'consulta')
    .eq('status', 'no_show')
    .not('client_id', 'is', null)
    .is('followup_falta_sent_at', null)

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
        `Olá! Aqui é a ${tenant.name}. Vimos que você não conseguiu comparecer na sua última consulta e ainda não remarcamos. Sabemos que imprevistos acontecem — quer escolher um novo horário?`
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
