'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateBudgetFollowupSettingsAction(input: { messageDay3: string; messageDay7: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      budget_followup_message_day3: input.messageDay3.trim() || null,
      budget_followup_message_day7: input.messageDay7.trim() || null,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes/lembretes')
}
