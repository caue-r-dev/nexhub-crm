'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentTenant } from '@/lib/tenant'
import { resolveTemplate } from '@/lib/message-templates'

export type CampaignFilterType = 'sem_visita' | 'orcamento_aberto'

export type CampaignPreviewItem = {
  clientId: string
  name: string
  phone: string
  detail: string
}

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Cliente sem NENHUMA visita concluída também entra — cadastro parado
// sem retorno conta como "ausente" pro dono, não só quem já veio e
// sumiu (decisão explícita, ver spec de campanhas de reengajamento).
async function findSemVisitaCandidates(tenantId: string, days: number): Promise<CampaignPreviewItem[]> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - days * 24 * 3600_000).toISOString()

  const { data: clients } = await admin
    .from('clients')
    .select('id, name, phone')
    .eq('tenant_id', tenantId)
    .not('phone', 'is', null)

  const { data: doneAppointments } = await admin
    .from('appointments')
    .select('client_id, datetime')
    .eq('tenant_id', tenantId)
    .eq('status', 'done')
    .not('client_id', 'is', null)

  const lastVisitByClient = new Map<string, string>()
  for (const appt of doneAppointments ?? []) {
    if (!appt.client_id) continue
    const current = lastVisitByClient.get(appt.client_id)
    if (!current || appt.datetime > current) lastVisitByClient.set(appt.client_id, appt.datetime)
  }

  const candidates: CampaignPreviewItem[] = []
  for (const client of clients ?? []) {
    if (!client.phone) continue
    const lastVisit = lastVisitByClient.get(client.id)
    if (lastVisit && lastVisit > cutoff) continue
    candidates.push({
      clientId: client.id,
      name: client.name,
      phone: client.phone,
      detail: lastVisit ? `última visita: ${formatDateBR(lastVisit)}` : 'nunca visitou',
    })
  }
  return candidates
}

async function findOrcamentoAbertoCandidates(tenantId: string, days: number): Promise<CampaignPreviewItem[]> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - days * 24 * 3600_000).toISOString()

  const { data: budgets } = await admin
    .from('treatment_budgets')
    .select('client_id, total, created_at, clients(name, phone)')
    .eq('tenant_id', tenantId)
    .is('approved_at', null)
    .is('declined_at', null)
    .lt('created_at', cutoff)

  const byClient = new Map<string, CampaignPreviewItem>()
  for (const budget of budgets ?? []) {
    const client = budget.clients as unknown as { name: string; phone: string | null } | null
    if (!client?.phone || !budget.client_id) continue
    // Cliente com mais de um orçamento aberto — mantém o mais antigo (mais urgente).
    if (byClient.has(budget.client_id)) continue
    byClient.set(budget.client_id, {
      clientId: budget.client_id,
      name: client.name,
      phone: client.phone,
      detail: `orçamento de ${formatBRL(budget.total)} aberto desde ${formatDateBR(budget.created_at)}`,
    })
  }
  return [...byClient.values()]
}

export async function previewCampaignAction(filterType: CampaignFilterType, days: number) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (days <= 0) return { error: 'Dias precisa ser maior que zero.' }

  const items =
    filterType === 'sem_visita'
      ? await findSemVisitaCandidates(tenant.id, days)
      : await findOrcamentoAbertoCandidates(tenant.id, days)

  return { items }
}

export async function createCampaignAction(input: {
  filterType: CampaignFilterType
  days: number
  clientIds: string[]
}) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (input.clientIds.length === 0) return { error: 'Selecione pelo menos um cliente.' }

  const templateKey = input.filterType === 'sem_visita' ? 'campanha_sem_visita' : 'campanha_orcamento_aberto'
  const defaultFallback =
    input.filterType === 'sem_visita'
      ? 'Olá {{nome_cliente}}! Faz um tempo que não te vemos por aqui (última visita: {{ultima_visita}}). Quer marcar um retorno?'
      : 'Olá {{nome_cliente}}! Seu orçamento de {{valor_orcamento}} continua disponível. Posso te ajudar a agendar?'

  const items =
    input.filterType === 'sem_visita'
      ? await findSemVisitaCandidates(tenant.id, input.days)
      : await findOrcamentoAbertoCandidates(tenant.id, input.days)

  const selected = items.filter((i) => input.clientIds.includes(i.clientId))
  if (selected.length === 0) return { error: 'Nenhum cliente válido selecionado.' }

  const supabase = await createClient()
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({ tenant_id: tenant.id, filter_type: input.filterType, filter_days: input.days })
    .select('id')
    .single()

  if (campaignError || !campaign) return { error: campaignError?.message ?? 'Erro ao criar campanha.' }

  const recipients = await Promise.all(
    selected.map(async (item) => {
      const context =
        input.filterType === 'sem_visita'
          ? { nome_cliente: item.name.split(' ')[0], ultima_visita: item.detail.replace('última visita: ', '') }
          : { nome_cliente: item.name.split(' ')[0], valor_orcamento: item.detail.match(/R\$\s?[\d.,]+/)?.[0] ?? '' }

      const message = await resolveTemplate(tenant.id, templateKey, context, defaultFallback)
      return {
        campaign_id: campaign.id,
        client_id: item.clientId,
        phone: item.phone,
        message,
      }
    })
  )

  const { error: recipientsError } = await supabase.from('campaign_recipients').insert(recipients)
  if (recipientsError) return { error: recipientsError.message }

  revalidatePath('/clientes/campanhas')
  return { ok: true, count: recipients.length }
}

export type CampaignSummary = {
  id: string
  filterType: CampaignFilterType
  filterDays: number
  createdAt: string
  total: number
  sent: number
  failed: number
  pending: number
  responded: number
  converted: number
}

export async function listCampaignsAction(): Promise<{ campaigns: CampaignSummary[] } | { error: string }> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, filter_type, filter_days, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  if (!campaigns || campaigns.length === 0) return { campaigns: [] }

  const admin = createAdminClient()
  const summaries: CampaignSummary[] = await Promise.all(
    campaigns.map(async (c) => {
      const { data: recipients } = await admin
        .from('campaign_recipients')
        .select('client_id, status, responded_at, sent_at')
        .eq('campaign_id', c.id)

      const rows = recipients ?? []
      const sent = rows.filter((r) => r.status === 'sent').length
      const failed = rows.filter((r) => r.status === 'failed').length
      const pending = rows.filter((r) => r.status === 'pending').length
      const responded = rows.filter((r) => r.responded_at !== null).length

      const sentClientIds = rows.filter((r) => r.sent_at).map((r) => r.client_id)
      let converted = 0
      if (sentClientIds.length > 0) {
        const { data: convertedAppointments } = await admin
          .from('appointments')
          .select('client_id')
          .in('client_id', sentClientIds)
          .gt('created_at', c.created_at)
        converted = new Set((convertedAppointments ?? []).map((a) => a.client_id)).size
      }

      return {
        id: c.id,
        filterType: c.filter_type,
        filterDays: c.filter_days,
        createdAt: c.created_at,
        total: rows.length,
        sent,
        failed,
        pending,
        responded,
        converted,
      }
    })
  )

  return { campaigns: summaries }
}
