'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateReminderSettingsAction(input: { message24h: string; message2h: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      reminder_message_24h: input.message24h.trim() || null,
      reminder_message_2h: input.message2h.trim() || null,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes/lembretes')
}
