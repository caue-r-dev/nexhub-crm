'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { TransactionStatus } from '@/lib/supabase/types'

export type TransactionInput = {
  clientId?: string
  amount: number
  dueDate?: string
  guiaNumber?: string
}

export async function createTransactionAction(input: TransactionInput) {
  if (!input.amount || input.amount <= 0) {
    return { error: 'Informe um valor válido.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('transactions').insert({
    tenant_id: tenant.id,
    client_id: input.clientId || null,
    amount: input.amount,
    due_date: input.dueDate || null,
    guia_number: input.guiaNumber || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/financeiro')
  redirect('/financeiro')
}

export async function updateTransactionStatusAction(id: string, status: TransactionStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('transactions').update({ status }).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/financeiro')
}
