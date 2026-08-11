'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type ProsthesisInput = {
  type: string
  toothNumber?: string
  status: string
  sentToLabAt?: string
  expectedReturnAt?: string
  receivedAt?: string
  deliveredAt?: string
  notes?: string
}

export async function createProsthesisAction(clientId: string, input: ProsthesisInput) {
  if (!input.type.trim()) return { error: 'Tipo é obrigatório.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('prostheses').insert({
    tenant_id: tenant.id,
    client_id: clientId,
    type: input.type.trim(),
    tooth_number: input.toothNumber?.trim() || null,
    status: input.status,
    sent_to_lab_at: input.sentToLabAt || null,
    expected_return_at: input.expectedReturnAt || null,
    received_at: input.receivedAt || null,
    delivered_at: input.deliveredAt || null,
    notes: input.notes?.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}/proteses`)
}

export async function updateProsthesisAction(id: string, clientId: string, input: ProsthesisInput) {
  if (!input.type.trim()) return { error: 'Tipo é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('prostheses')
    .update({
      type: input.type.trim(),
      tooth_number: input.toothNumber?.trim() || null,
      status: input.status,
      sent_to_lab_at: input.sentToLabAt || null,
      expected_return_at: input.expectedReturnAt || null,
      received_at: input.receivedAt || null,
      delivered_at: input.deliveredAt || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}/proteses`)
}

export async function deleteProsthesisAction(id: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('prostheses').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}/proteses`)
}
