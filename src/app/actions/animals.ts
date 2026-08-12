'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type AnimalInput = {
  clientId: string
  name: string
  species?: string
  breed?: string
  weight?: number
  birthDate?: string
}

export async function createAnimalAction(input: AnimalInput) {
  if (!input.name.trim()) return { error: 'Nome do animal é obrigatório.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('animals')
    .insert({
      tenant_id: tenant.id,
      client_id: input.clientId,
      name: input.name.trim(),
      species: input.species || null,
      breed: input.breed || null,
      weight: input.weight || null,
      birth_date: input.birthDate || null,
    })
    .select()
    .single()

  if (error || !data) return { error: error?.message ?? 'Não foi possível cadastrar o animal.' }

  revalidatePath(`/clientes/${input.clientId}/animais`)
  redirect(`/clientes/${input.clientId}/animais/${data.id}`)
}

export async function toggleHospitalizedAction(animalId: string, clientId: string, hospitalized: boolean) {
  const supabase = await createClient()

  if (hospitalized) {
    const tenant = await getCurrentTenant()
    if (!tenant) return { error: 'Sessão inválida.' }
    const { error: hospError } = await supabase.from('animal_hospitalizations').insert({
      tenant_id: tenant.id,
      animal_id: animalId,
    })
    if (hospError) return { error: hospError.message }
  } else {
    const { error: dischargeError } = await supabase
      .from('animal_hospitalizations')
      .update({ discharged_at: new Date().toISOString() })
      .eq('animal_id', animalId)
      .is('discharged_at', null)
    if (dischargeError) return { error: dischargeError.message }
  }

  const { error } = await supabase.from('animals').update({ hospitalized }).eq('id', animalId)
  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/animais/${animalId}`)
  revalidatePath('/animais')
}

export async function addHospitalizationNoteAction(hospitalizationId: string, animalId: string, note: string) {
  if (!note.trim()) return { error: 'Escreva uma nota.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('animal_hospitalization_notes').insert({
    tenant_id: tenant.id,
    hospitalization_id: hospitalizationId,
    note: note.trim(),
  })

  if (error) return { error: error.message }
  revalidatePath(`/animais`)
}

export async function addVaccineAction(input: {
  animalId: string
  vaccineName: string
  appliedAt: string
  professional?: string
  nextDoseAt?: string
}) {
  if (!input.vaccineName.trim() || !input.appliedAt) return { error: 'Preencha vacina e data.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('animal_vaccines').insert({
    tenant_id: tenant.id,
    animal_id: input.animalId,
    vaccine_name: input.vaccineName.trim(),
    applied_at: input.appliedAt,
    professional: input.professional || null,
    next_dose_at: input.nextDoseAt || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/clientes`)
}
