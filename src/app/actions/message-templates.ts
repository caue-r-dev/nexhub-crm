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
    .select('template_key, content, active')
    .eq('tenant_id', tenant.id)

  if (error) return { error: error.message }

  const byKey = new Map((data ?? []).map((row) => [row.template_key, row]))
  const templates = TEMPLATE_KEYS.map(({ key, label }) => ({
    key,
    label,
    content: byKey.get(key)?.content ?? '',
    active: byKey.get(key)?.active ?? true,
  }))

  return { templates }
}

export async function updateMessageTemplateAction(input: { key: string; content: string; active: boolean }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (!input.content.trim()) return { error: 'Conteúdo não pode ficar vazio.' }

  const supabase = await createClient()
  const { error } = await supabase.from('message_templates').upsert(
    {
      tenant_id: tenant.id,
      template_key: input.key,
      content: input.content.trim(),
      active: input.active,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,template_key' }
  )

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/mensagens')
}
