'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type ProfessionalHourInput = { weekday: number; active: boolean; start: string; end: string }

export async function updateProfessionalHoursAction(professionalId: string, days: ProfessionalHourInput[]) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  for (const day of days) {
    if (day.active && day.start >= day.end) {
      return { error: 'Horário de início precisa ser antes do horário de término.' }
    }
  }

  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('professional_hours')
    .delete()
    .eq('professional_id', professionalId)

  if (deleteError) return { error: deleteError.message }

  const rows = days
    .filter((d) => d.active)
    .map((d) => ({
      tenant_id: tenant.id,
      professional_id: professionalId,
      weekday: d.weekday,
      start_time: d.start,
      end_time: d.end,
    }))

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('professional_hours').insert(rows)
    if (insertError) return { error: insertError.message }
  }

  revalidatePath(`/agenda/profissionais/${professionalId}/editar`)
}
