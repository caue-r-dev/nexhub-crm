'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateGoogleReviewLinkAction(link: string) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tenants').update({ google_review_link: link.trim() || null }).eq('id', tenant.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/satisfacao')
}
