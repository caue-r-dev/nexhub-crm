import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type Tenant = Database['public']['Tables']['tenants']['Row']

export async function getCurrentTenant(): Promise<Tenant | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userRow } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single()

  if (!userRow) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userRow.tenant_id)
    .single()

  return tenant
}

// Módulos específicos de nicho (ex: Odontograma) só carregam pra quem tem o
// slug correspondente — núcleo comum nunca muda, só o que aparece a mais.
export async function getCurrentTenantNicheSlug(): Promise<string | null> {
  const tenant = await getCurrentTenant()
  if (!tenant) return null

  const supabase = await createClient()
  const { data } = await supabase.from('niches').select('slug').eq('id', tenant.niche_id).single()
  return data?.slug ?? null
}
