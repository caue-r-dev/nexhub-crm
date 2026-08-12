'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createProcedureTypeAction(name: string, defaultDurationMin?: number) {
  if (!name.trim()) return { error: 'Informe um nome.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('procedure_types').insert({
    tenant_id: tenant.id,
    name: name.trim(),
    default_duration_min: defaultDurationMin || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function toggleProcedureTypeAction(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('procedure_types').update({ active }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function updateProcedureTypeDurationAction(id: string, defaultDurationMin: number | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('procedure_types')
    .update({ default_duration_min: defaultDurationMin })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function updateProcedureTypeProtocolAction(id: string, protocol: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('procedure_types')
    .update({ protocol: protocol.trim() || null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}
