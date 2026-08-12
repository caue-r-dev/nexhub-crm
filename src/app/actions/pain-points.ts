'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type PainPointView = 'front' | 'back'

export async function addPainPointAction(input: {
  clientId: string
  view: PainPointView
  x: number
  y: number
  note: string
}) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pain_points')
    .insert({
      tenant_id: tenant.id,
      client_id: input.clientId,
      view: input.view,
      x: input.x,
      y: input.y,
      note: input.note.trim(),
    })
    .select()
    .single()

  if (error || !data) return { error: error?.message ?? 'Não foi possível salvar.' }

  revalidatePath(`/clientes/${input.clientId}/dor`)
  return { point: data }
}

export async function deletePainPointAction(id: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('pain_points').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}/dor`)
}
