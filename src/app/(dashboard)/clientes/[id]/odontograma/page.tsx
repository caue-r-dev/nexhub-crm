import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { OdontogramGrid } from '@/components/odontograma/OdontogramGrid'

export default async function OdontogramaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const { data: records } = await supabase
    .from('odontogram_records')
    .select('tooth_number, status')
    .eq('client_id', id)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="odontograma" />
      <OdontogramGrid clientId={id} records={records ?? []} />
    </div>
  )
}
