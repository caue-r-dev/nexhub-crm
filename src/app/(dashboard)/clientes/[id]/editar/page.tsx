import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ClientForm } from '@/components/clientes/ClientForm'

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Editar cliente</h1>
      <ClientForm
        clientId={client.id}
        nicheSlug={nicheSlug}
        initial={{
          name: client.name,
          phone: client.phone ?? '',
          document: client.document ?? '',
          birthDate: client.birth_date ?? '',
          convenio: client.convenio ?? '',
        }}
      />
    </div>
  )
}
