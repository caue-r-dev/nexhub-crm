'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function adminLoginAction(input: { email: string; password: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(input)

  if (error || !data.user) {
    return { error: error?.message ?? 'Não foi possível entrar.' }
  }

  const admin = createAdminClient()
  const { data: adminRow } = await admin
    .from('admin_users')
    .select('id')
    .eq('auth_id', data.user.id)
    .single()

  if (!adminRow) {
    await supabase.auth.signOut()
    return { error: 'Acesso negado.' }
  }

  redirect('/admin')
}
