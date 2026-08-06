'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type ProfessionalInput = { name: string; color: string; active?: boolean }

export async function createProfessionalAction(input: ProfessionalInput) {
  if (!input.name.trim()) return { error: 'Nome é obrigatório.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('professionals').insert({
    tenant_id: tenant.id,
    name: input.name.trim(),
    color: input.color,
  })

  if (error) return { error: error.message }

  revalidatePath('/agenda')
  redirect('/agenda')
}

export async function updateProfessionalAction(id: string, input: ProfessionalInput) {
  if (!input.name.trim()) return { error: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('professionals')
    .update({ name: input.name.trim(), color: input.color, active: input.active ?? true })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/agenda')
  redirect('/agenda')
}
