'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { TransactionStatus, TransactionType } from '@/lib/supabase/types'

export type TransactionInput = {
  type: TransactionType
  clientId?: string
  amount: number
  dueDate?: string
  guiaNumber?: string
  description?: string
}

export async function createTransactionAction(input: TransactionInput) {
  if (!input.amount || input.amount <= 0) {
    return { error: 'Informe um valor válido.' }
  }
  if (input.type === 'despesa' && !input.description?.trim()) {
    return { error: 'Descreva a despesa.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('transactions').insert({
    tenant_id: tenant.id,
    type: input.type,
    client_id: input.type === 'receita' ? input.clientId || null : null,
    amount: input.amount,
    due_date: input.dueDate || null,
    guia_number: input.type === 'receita' ? input.guiaNumber || null : null,
    description: input.description?.trim() || null,
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
