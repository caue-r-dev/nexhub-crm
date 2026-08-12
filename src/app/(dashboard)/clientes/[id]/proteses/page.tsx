import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { ProsthesisManager } from '@/components/proteses/ProsthesisManager'

export default async function ProtesesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (nicheSlug !== 'dentista') notFound()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const { data: prostheses } = await supabase
    .from('prostheses')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="proteses" nicheSlug={nicheSlug} />
      <ProsthesisManager clientId={id} initial={prostheses ?? []} />
    </div>
  )
}
