'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { BusinessHours } from '@/lib/supabase/types'

export async function updateBusinessHoursAction(hours: BusinessHours) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({ business_hours: hours })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes/horarios')
  revalidatePath('/agenda')
}
