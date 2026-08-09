// Chamado pelo n8n (cron 1x por dia, diferente do lembrete de consulta que roda
// a cada ~15min — recuperação de orçamento trabalha em granularidade de dia) —
// nunca pelo frontend. Varre todos os tenants (service role, ignora RLS de
// propósito) procurando orçamentos sem aprovar/recusar há 3 ou 7 dias, manda
// WhatsApp e marca o envio pra não duplicar na próxima execução. Um orçamento
// que vira aprovado ou recusado simplesmente some da consulta (filtro
// approved_at/declined_at is null) — não precisa de lógica extra pra "parar".
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

const DEFAULT_DAY3 =
  'Olá {{nome}}! Vi que seu orçamento de {{valor}} na {{clinica}} ainda tá em aberto. Posso te ajudar a agendar?'
const DEFAULT_DAY7 =
  'Olá {{nome}}! Seu orçamento de {{valor}} na {{clinica}} continua disponível. Quer que eu já deixe seu horário marcado?'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function applyTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => vars[key] ?? match)
}

function daysSince(iso: string): number {
  const created = new Date(iso).getTime()
  const now = Date.now()
  return Math.floor((now - created) / (24 * 3600_000))
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()

  const { data: budgets, error } = await admin
    .from('treatment_budgets')
    .select(
      'id, total, created_at, followup_day3_sent_at, followup_day7_sent_at, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name, budget_followup_message_day3, budget_followup_message_day7)'
    )
    .is('approved_at', null)
    .is('declined_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { budgetId: string; window: '3d' | '7d'; client: string; sent: boolean; error?: string }[] = []

  for (const budget of budgets ?? []) {
    const client = budget.clients as unknown as { name: string; phone: string | null } | null
    const tenant = budget.tenants as unknown as {
      name: string
      evolution_base_url: string | null
      evolution_api_key: string | null
      evolution_instance_name: string | null
      budget_followup_message_day3: string | null
      budget_followup_message_day7: string | null
    } | null

    const age = daysSince(budget.created_at)

    let window: '3d' | '7d' | null = null
    if (age >= 7 && !budget.followup_day7_sent_at) {
      window = '7d'
    } else if (age >= 3 && age < 7 && !budget.followup_day3_sent_at) {
      window = '3d'
    }

    if (!window) continue

    if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      results.push({
        budgetId: budget.id,
        window,
        client: client?.name ?? '—',
        sent: false,
        error: 'Sem telefone ou WhatsApp não configurado pro tenant.',
      })
      continue
    }

    const customTemplate = window === '3d' ? tenant.budget_followup_message_day3 : tenant.budget_followup_message_day7
    const defaultTemplate = window === '3d' ? DEFAULT_DAY3 : DEFAULT_DAY7
    const template = customTemplate?.trim() || defaultTemplate
    const message = applyTemplate(template, {
      nome: client.name.split(' ')[0],
      valor: formatBRL(budget.total),
      clinica: tenant.name,
    })

    if (dryRun) {
      results.push({ budgetId: budget.id, window, client: client.name, sent: false, error: 'dry-run' })
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
        window === '3d' ? { followup_day3_sent_at: new Date().toISOString() } : { followup_day7_sent_at: new Date().toISOString() }
      const { error: updateError } = await admin.from('treatment_budgets').update(sentAtPatch).eq('id', budget.id)
      if (updateError) {
        results.push({
          budgetId: budget.id,
          window,
          client: client.name,
          sent: false,
          error: `Mensagem enviada mas falha ao marcar como enviada: ${updateError.message}`,
        })
        continue
      }
      results.push({ budgetId: budget.id, window, client: client.name, sent: true })
    } catch (e) {
      results.push({
        budgetId: budget.id,
        window,
        client: client.name,
        sent: false,
        error: e instanceof Error ? e.message : 'Erro desconhecido.',
      })
    }
  }

  return NextResponse.json({ results })
}
