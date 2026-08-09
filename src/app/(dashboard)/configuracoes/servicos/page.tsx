import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { ServicesForm } from '@/components/configuracoes/ServicesForm'

export default async function ServicosPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const { data: services } = tenant
    ? await supabase
        .from('services')
        .select('id, name, default_value, active')
        .eq('tenant_id', tenant.id)
        .order('name')
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Serviços</h1>
        <p className="text-text-secondary">
          Catálogo de serviços/tratamentos com valor padrão, usado ao montar um orçamento.
          Desmarque pra esconder sem apagar o histórico.
        </p>
      </div>
      <ServicesForm initial={services ?? []} />
    </div>
  )
}
