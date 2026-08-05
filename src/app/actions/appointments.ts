'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { AppointmentStatus, AppointmentType } from '@/lib/supabase/types'

export type AppointmentInput = {
  type: AppointmentType
  clientId?: string
  title?: string
  labelId?: string
  datetime: string
  durationMin: number
  notes?: string
}

export async function createAppointmentAction(input: AppointmentInput) {
  if (!input.datetime) {
    return { error: 'Data/hora é obrigatória.' }
  }
  if (input.type === 'consulta' && !input.clientId) {
    return { error: 'Selecione um cliente para a consulta.' }
  }
  if (input.type === 'compromisso' && !input.title?.trim()) {
    return { error: 'Informe um título para o compromisso.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('appointments').insert({
    tenant_id: tenant.id,
    type: input.type,
    client_id: input.type === 'consulta' ? input.clientId : null,
    title: input.type === 'compromisso' ? input.title!.trim() : null,
    label_id: input.labelId || null,
    datetime: input.datetime,
    duration_min: input.durationMin || 30,
    notes: input.notes || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/agenda')
  redirect('/agenda')
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/agenda')
}
