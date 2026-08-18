'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { BusinessHours } from '@/lib/supabase/types'

export type ProfessionalInput = {
  name: string
  color: string
  active?: boolean
  registrationNumber?: string
  role?: string
  bio?: string
}

// weekday numérico segue Date.getDay() (0=domingo...6=sábado), mesma
// convenção usada em availability.ts pra calcular horário livre.
const WEEKDAY_NUMBERS: Record<keyof BusinessHours, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export async function createProfessionalAction(input: ProfessionalInput) {
  if (!input.name.trim()) return { error: 'Nome é obrigatório.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data: professional, error } = await supabase
    .from('professionals')
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      color: input.color,
      registration_number: input.registrationNumber?.trim() || null,
      role: input.role?.trim() || null,
      bio: input.bio?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !professional) return { error: error?.message ?? 'Não foi possível criar o profissional.' }

  // Herda o horário de funcionamento da clínica — sem isso o profissional
  // nasce sem nenhuma linha em professional_hours e o link público de
  // agendamento nunca mostra horário livre nenhum pra ele até alguém
  // configurar manualmente (agenda "fechada" por omissão, não por escolha).
  const { data: tenantRow } = await supabase.from('tenants').select('business_hours').eq('id', tenant.id).single()
  const businessHours = tenantRow?.business_hours as BusinessHours | null
  if (businessHours) {
    const rows = (Object.keys(WEEKDAY_NUMBERS) as (keyof BusinessHours)[])
      .filter((day) => businessHours[day]?.active)
      .map((day) => ({
        tenant_id: tenant.id,
        professional_id: professional.id,
        weekday: WEEKDAY_NUMBERS[day],
        start_time: businessHours[day].start,
        end_time: businessHours[day].end,
      }))
    if (rows.length > 0) {
      await supabase.from('professional_hours').insert(rows)
    }
  }

  revalidatePath('/agenda')
  redirect('/agenda')
}

export async function updateProfessionalAction(id: string, input: ProfessionalInput) {
  if (!input.name.trim()) return { error: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('professionals')
    .update({
      name: input.name.trim(),
      color: input.color,
      active: input.active ?? true,
      registration_number: input.registrationNumber?.trim() || null,
      role: input.role?.trim() || null,
      bio: input.bio?.trim() || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/agenda')
  redirect('/agenda')
}

export async function updateProfessionalPhotoAction(id: string, photoPath: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.from('professionals').update({ photo_url: photoPath }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/agenda/profissionais/${id}/editar`)
}
