'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateBotSettingsAction(input: { botEnabled: boolean; botContextNotes: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      bot_enabled: input.botEnabled,
      bot_context_notes: input.botContextNotes.trim() || null,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/mensagens')
}
