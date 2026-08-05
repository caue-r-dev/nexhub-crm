'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function upsertAnamnesisAction(
  clientId: string,
  questionnaire: Record<string, unknown>
) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('anamnesis')
    .upsert(
      { tenant_id: tenant.id, client_id: clientId, questionnaire, updated_at: new Date().toISOString() },
      { onConflict: 'client_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/anamnese`)
}
