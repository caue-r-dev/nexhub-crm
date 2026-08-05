'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { TreatmentStatus } from '@/lib/supabase/types'

export async function createTreatmentAction(
  clientId: string,
  input: { procedure: string; budgetId?: string }
) {
  if (!input.procedure.trim()) return { error: 'Informe o procedimento.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('treatments').insert({
    tenant_id: tenant.id,
    client_id: clientId,
    procedure: input.procedure.trim(),
    budget_id: input.budgetId || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/tratamentos`)
}

export async function updateTreatmentStatusAction(
  id: string,
  clientId: string,
  status: TreatmentStatus
) {
  const supabase = await createClient()
  const { error } = await supabase.from('treatments').update({ status }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/tratamentos`)
}
