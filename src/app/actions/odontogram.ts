'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { OdontogramStatus } from '@/lib/supabase/types'

export async function upsertToothAction(
  clientId: string,
  toothNumber: string,
  status: OdontogramStatus
) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('odontogram_records')
    .upsert(
      { tenant_id: tenant.id, client_id: clientId, tooth_number: toothNumber, status },
      { onConflict: 'client_id,tooth_number' }
    )

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/odontograma`)
}
