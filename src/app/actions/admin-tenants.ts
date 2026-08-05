'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionStatus } from '@/lib/supabase/types'

async function requireAdmin() {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error('Acesso negado.')
  return createAdminClient()
}

export type TenantAdminInput = {
  trialEndsAt?: string
  monthlyPrice?: number
  nextDueDate?: string
  adminNotes?: string
}

export async function updateTenantAdminAction(id: string, input: TenantAdminInput) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('tenants')
    .update({
      trial_ends_at: input.trialEndsAt || null,
      monthly_price: input.monthlyPrice ?? null,
      next_due_date: input.nextDueDate || null,
      admin_notes: input.adminNotes || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/admin/tenants/${id}`)
  redirect(`/admin/tenants/${id}`)
}

export async function setSubscriptionStatusAction(id: string, status: SubscriptionStatus) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('tenants').update({ subscription_status: status }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/admin/tenants/${id}`)
}

export async function markPaidAction(id: string) {
  const supabase = await requireAdmin()

  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('next_due_date')
    .eq('id', id)
    .single()

  if (fetchError || !tenant) return { error: fetchError?.message ?? 'Tenant não encontrado.' }

  const base = tenant.next_due_date ? new Date(`${tenant.next_due_date}T00:00:00Z`) : new Date()
  const today = new Date()
  const from = base.getTime() > today.getTime() ? base : today
  const nextDue = new Date(from)
  nextDue.setUTCMonth(nextDue.getUTCMonth() + 1)

  const { error } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      next_due_date: nextDue.toISOString().slice(0, 10),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  revalidatePath(`/admin/tenants/${id}`)
}
