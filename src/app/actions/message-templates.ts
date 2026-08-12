'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { TEMPLATE_KEYS } from '@/lib/message-templates'

export async function listMessageTemplatesAction() {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('message_templates')
    .select('template_key, content, active, label, hidden')
    .eq('tenant_id', tenant.id)

  if (error) return { error: error.message }

  const byKey = new Map((data ?? []).map((row) => [row.template_key, row]))
  // Cards de campanha têm tela própria (perto de lembretes), não duplicam aqui.
  const CAMPAIGN_KEYS = new Set(['campanha_sem_visita', 'campanha_orcamento_aberto'])
  const templates = TEMPLATE_KEYS.filter(({ key }) => !CAMPAIGN_KEYS.has(key) && !byKey.get(key)?.hidden).map(({ key, label }) => ({
    key,
    label: byKey.get(key)?.label?.trim() || label,
    content: byKey.get(key)?.content ?? '',
    active: byKey.get(key)?.active ?? true,
  }))

  return { templates }
}

export async function updateMessageTemplateAction(input: { key: string; content: string; active: boolean; label: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (!input.content.trim()) return { error: 'Conteúdo não pode ficar vazio.' }

  const defaultLabel = TEMPLATE_KEYS.find((t) => t.key === input.key)?.label ?? ''

  const supabase = await createClient()
  const { error } = await supabase.from('message_templates').upsert(
    {
      tenant_id: tenant.id,
      template_key: input.key,
      content: input.content.trim(),
      active: input.active,
      label: input.label.trim() && input.label.trim() !== defaultLabel ? input.label.trim() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,template_key' }
  )

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/mensagens')
}

export async function hideMessageTemplateAction(key: string) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()

  // Update primeiro pra não pisar em conteúdo já customizado — só insere
  // linha nova (com conteúdo placeholder, nunca usado de verdade porque
  // hidden=true faz resolveTemplate cair direto no fallback) se o dono
  // nunca tinha mexido nesse card antes.
  const { data: updated, error: updateError } = await supabase
    .from('message_templates')
    .update({ hidden: true, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenant.id)
    .eq('template_key', key)
    .select('id')

  if (updateError) return { error: updateError.message }

  if (!updated || updated.length === 0) {
    const { error: insertError } = await supabase.from('message_templates').insert({
      tenant_id: tenant.id,
      template_key: key,
      content: TEMPLATE_KEYS.find((t) => t.key === key)?.label ?? key,
      hidden: true,
    })
    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/configuracoes/mensagens')
}
