'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createLabelAction(input: { name: string; color: string }) {
  if (!input.name.trim()) {
    return { error: 'Nome é obrigatório.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointment_labels')
    .insert({ tenant_id: tenant.id, name: input.name.trim(), color: input.color })
    .select()
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Não foi possível criar a etiqueta.' }
  }

  revalidatePath('/agenda')
  revalidatePath('/agenda/novo')
  return { label: data }
}
