import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type CurrentAdmin = { id: string; email: string }

// Sempre via service role — admin_users não depende de RLS por tenant, e o
// próprio propósito do painel admin é enxergar todos os tenants de uma vez.
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_users')
    .select('id, email')
    .eq('auth_id', user.id)
    .single()

  return data
}
