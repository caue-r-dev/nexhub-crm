import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { PAIN_MAP_NICHES } from '@/lib/niche-features'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { PainMap } from '@/components/dor/PainMap'

export default async function DorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (!nicheSlug || !PAIN_MAP_NICHES.has(nicheSlug)) notFound()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const { data: points } = await supabase
    .from('pain_points')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="dor" nicheSlug={nicheSlug} />
      <PainMap clientId={id} initial={points ?? []} />
    </div>
  )
}
