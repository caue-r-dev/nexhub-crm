'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function upsertProcedureDurationAction(
  professionalId: string,
  procedureTypeId: string,
  durationMin: number | null
) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()

  if (durationMin === null) {
    const { error } = await supabase
      .from('professional_procedure_durations')
      .delete()
      .eq('professional_id', professionalId)
      .eq('procedure_type_id', procedureTypeId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('professional_procedure_durations')
      .upsert(
        { tenant_id: tenant.id, professional_id: professionalId, procedure_type_id: procedureTypeId, duration_min: durationMin },
        { onConflict: 'professional_id,procedure_type_id' }
      )
    if (error) return { error: error.message }
  }

  revalidatePath(`/agenda/profissionais/${professionalId}/editar`)
}
