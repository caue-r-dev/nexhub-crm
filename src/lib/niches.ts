import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export type Niche = Database['public']['Tables']['niches']['Row']

export async function getNiches(): Promise<Niche[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('niches')
    .select('*')
    .eq('active', true)
    .order('sort_order')

  return data ?? []
}
