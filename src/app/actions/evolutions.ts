'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createEvolutionAction(
  clientId: string,
  input: { note: string; appointmentId?: string; professional?: string }
) {
  if (!input.note.trim()) return { error: 'Escreva uma anotação.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('evolutions').insert({
    tenant_id: tenant.id,
    client_id: clientId,
    note: input.note.trim(),
    appointment_id: input.appointmentId || null,
    professional: input.professional || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/evolucoes`)
}
