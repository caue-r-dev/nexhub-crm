// Chamado pelo n8n (cron 1x por dia) — avisa o tutor quando a próxima dose
// de vacina do animal está chegando (3 dias antes). Mesmo padrão dos outros
// automations: service role, ignora RLS de propósito, marca sent_at pra não
// duplicar.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

const REMINDER_WINDOW_DAYS = 3

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()
  const targetDate = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 3600_000).toISOString().slice(0, 10)

  const { data: vaccines } = await admin
    .from('animal_vaccines')
    .select(
      'id, vaccine_name, next_dose_at, animals(id, name, client_id, tenant_id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name))'
    )
    .eq('next_dose_at', targetDate)
    .is('reminder_sent_at', null)

  const results: { id: string; animal: string; sent: boolean; error?: string }[] = []

  for (const vaccine of vaccines ?? []) {
    const animal = vaccine.animals as unknown as {
      name: string
      clients: { name: string; phone: string | null } | null
      tenants: {
        name: string
        evolution_base_url: string | null
        evolution_api_key: string | null
        evolution_instance_name: string | null
      } | null
    } | null

    const client = animal?.clients
    const tenant = animal?.tenants

    if (!animal || !client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      results.push({ id: vaccine.id, animal: animal?.name ?? '—', sent: false, error: 'Sem WhatsApp configurado ou tutor sem telefone.' })
      continue
    }

    const message = `Olá! Aqui é a ${tenant.name}. A vacina "${vaccine.vaccine_name}" do(a) ${animal.name} está prevista pra daqui a ${REMINDER_WINDOW_DAYS} dias. Vamos agendar?`

    if (dryRun) {
      results.push({ id: vaccine.id, animal: animal.name, sent: false, error: 'dry-run' })
      continue
    }

    try {
      await sendWhatsAppText(
        { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
        client.phone,
        message
      )
      await admin.from('animal_vaccines').update({ reminder_sent_at: new Date().toISOString() }).eq('id', vaccine.id)
      results.push({ id: vaccine.id, animal: animal.name, sent: true })
    } catch (e) {
      results.push({ id: vaccine.id, animal: animal.name, sent: false, error: e instanceof Error ? e.message : 'Erro.' })
    }
  }

  return NextResponse.json({ results })
}
