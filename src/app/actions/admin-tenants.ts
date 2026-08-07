'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
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

// Gera senha temporária e já troca no auth.users via admin API — cliente loga
// com ela e o ideal é trocar assim que entrar. Não fica salva em lugar
// nenhum: só passa pela tela uma vez, quem repassa pro cliente é o admin.
export async function generateTempPasswordAction(
  userId: string
): Promise<{ error: string } | { tempPassword: string; email: string }> {
  const supabase = await requireAdmin()

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('auth_id, email')
    .eq('id', userId)
    .single()

  if (fetchError || !user) return { error: fetchError?.message ?? 'Usuário não encontrado.' }

  const tempPassword = crypto.randomBytes(9).toString('base64url')

  const { error } = await supabase.auth.admin.updateUserById(user.auth_id, {
    password: tempPassword,
  })

  if (error) return { error: error.message }

  return { tempPassword, email: user.email }
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

export async function generateTrialTenantAction(
  email: string
): Promise<{ error: string } | { tempPassword: string; email: string }> {
  const supabase = await requireAdmin()

  const { data: niche } = await supabase
    .from('niches')
    .select('id')
    .eq('active', true)
    .order('sort_order')
    .limit(1)
    .single()

  if (!niche) return { error: 'Nenhum nicho ativo cadastrado.' }

  const tempPassword = crypto.randomBytes(9).toString('base64url')

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Não foi possível criar a conta.' }
  }

  const trialEndsAt = new Date()
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 7)

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'Novo tenant',
      niche_id: niche.id,
      theme_palette: 'petroleo',
      subscription_status: 'trial',
      trial_ends_at: trialEndsAt.toISOString().slice(0, 10),
      onboarding_completed: false,
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: tenantError?.message ?? 'Não foi possível criar o tenant.' }
  }

  const { error: userError } = await supabase.from('users').insert({
    tenant_id: tenant.id,
    auth_id: authData.user.id,
    email,
    role: 'owner',
  })

  if (userError) {
    await supabase.from('tenants').delete().eq('id', tenant.id)
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: userError.message }
  }

  revalidatePath('/admin')

  return { tempPassword, email }
}

// Apaga o tenant e tudo que depende dele (clients, appointments, etc — tudo
// via "on delete cascade" nas FKs). O que o cascade NÃO cobre são as contas
// em auth.users dos usuários desse tenant (users.tenant_id cascateia pra
// dentro, não pra auth.users) — por isso apaga essas contas manualmente
// depois de derrubar o tenant.
export async function deleteTenantAction(id: string): Promise<{ error: string } | undefined> {
  const supabase = await requireAdmin()

  const { data: users } = await supabase.from('users').select('auth_id').eq('tenant_id', id)

  const { error } = await supabase.from('tenants').delete().eq('id', id)
  if (error) return { error: error.message }

  for (const user of users ?? []) {
    await supabase.auth.admin.deleteUser(user.auth_id)
  }

  revalidatePath('/admin')
  redirect('/admin')
}
