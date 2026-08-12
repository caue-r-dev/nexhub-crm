import { ClientForm } from '@/components/clientes/ClientForm'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'

export default async function NovoClientePage() {
  const nicheSlug = await getCurrentTenantNicheSlug()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo cliente</h1>
      <ClientForm nicheSlug={nicheSlug} />
    </div>
  )
}
