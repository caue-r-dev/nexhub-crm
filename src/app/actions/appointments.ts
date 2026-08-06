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
  professionalId?: string
  packageId?: string
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
    professional_id: input.professionalId || null,
    package_id: input.packageId || null,
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

  const { data: current } = await supabase
    .from('appointments')
    .select('status, package_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  if (current && current.package_id && current.status !== 'done' && status === 'done') {
    const { data: pkg } = await supabase
      .from('packages')
      .select('used_sessions')
      .eq('id', current.package_id)
      .single()

    if (pkg) {
      await supabase
        .from('packages')
        .update({ used_sessions: pkg.used_sessions + 1 })
        .eq('id', current.package_id)
    }
  }

  revalidatePath('/agenda')
  revalidatePath('/clientes')
}
