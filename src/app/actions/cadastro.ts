'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { seedDefaultTemplates } from '@/lib/message-templates'
import type { PaletteType } from '@/lib/supabase/types'

export type CadastroInput = {
  businessName: string
  email: string
  password: string
  nicheId: string
  palette: PaletteType
}

export type CadastroResult = { error: string } | never

export async function cadastroAction(input: CadastroInput): Promise<CadastroResult> {
  const { businessName, email, password, nicheId, palette } = input

  if (!businessName || !email || !password || !nicheId || !palette) {
    return { error: 'Preencha todos os campos.' }
  }

  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Não foi possível criar a conta.' }
  }

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: businessName, niche_id: nicheId, theme_palette: palette, onboarding_completed: false })
    .select()
    .single()

  if (tenantError || !tenant) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: tenantError?.message ?? 'Não foi possível criar o tenant.' }
  }

  await seedDefaultTemplates(tenant.id)

  const { error: userError } = await admin.from('users').insert({
    tenant_id: tenant.id,
    auth_id: authData.user.id,
    email,
    role: 'owner',
  })

  if (userError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: userError.message }
  }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) {
    return { error: signInError.message }
  }

  redirect('/painel')
}
