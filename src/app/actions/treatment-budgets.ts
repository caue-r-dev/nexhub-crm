'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { BudgetItem } from '@/lib/supabase/types'

export type BudgetInput = {
  items: BudgetItem[]
  downPayment: number
  installments: number
  discount: number
  professionalId?: string
  feeType?: 'fixo' | 'exito' | 'misto'
  successFeePercent?: number
  caseValue?: number
}

export async function createBudgetAction(clientId: string, input: BudgetInput) {
  if (!input.items.length) return { error: 'Adicione ao menos um item.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const total = Math.max(0, subtotal - input.discount)

  const supabase = await createClient()
  const { error } = await supabase.from('treatment_budgets').insert({
    tenant_id: tenant.id,
    client_id: clientId,
    items: input.items,
    total,
    down_payment: input.downPayment,
    installments: input.installments || 1,
    discount: input.discount,
    professional_id: input.professionalId || null,
    fee_type: input.feeType || null,
    success_fee_percent: input.successFeePercent || null,
    case_value: input.caseValue || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/orcamentos`)
}

export async function approveBudgetAction(id: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('treatment_budgets')
    .update({ approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/orcamentos`)
}

export async function declineBudgetAction(id: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('treatment_budgets')
    .update({ declined_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/orcamentos`)
}
