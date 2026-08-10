'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type InventoryItemInput = {
  name: string
  quantity: number
  unit: string
  minQuantity?: number | null
  expiresAt?: string | null
  notes?: string | null
}

export async function createInventoryItemAction(input: InventoryItemInput) {
  if (!input.name.trim()) return { error: 'Informe um nome.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('inventory_items').insert({
    tenant_id: tenant.id,
    name: input.name.trim(),
    quantity: input.quantity,
    unit: input.unit.trim() || 'un',
    min_quantity: input.minQuantity ?? null,
    expires_at: input.expiresAt || null,
    notes: input.notes?.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/estoque')
}

export async function updateInventoryItemAction(id: string, input: InventoryItemInput) {
  if (!input.name.trim()) return { error: 'Informe um nome.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_items')
    .update({
      name: input.name.trim(),
      quantity: input.quantity,
      unit: input.unit.trim() || 'un',
      min_quantity: input.minQuantity ?? null,
      expires_at: input.expiresAt || null,
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/estoque')
}

export async function adjustInventoryQuantityAction(id: string, delta: number) {
  const supabase = await createClient()

  const { data: current } = await supabase.from('inventory_items').select('quantity').eq('id', id).single()
  if (!current) return { error: 'Item não encontrado.' }

  const next = Math.max(0, current.quantity + delta)
  const { error } = await supabase.from('inventory_items').update({ quantity: next }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/estoque')
}

export async function deleteInventoryItemAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('inventory_items').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/estoque')
}
