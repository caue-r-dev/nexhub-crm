import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { ProcedureTypesForm } from '@/components/configuracoes/ProcedureTypesForm'

export default async function ProcedimentosPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const { data: procedureTypes } = tenant
    ? await supabase
        .from('procedure_types')
        .select('id, name, active, default_duration_min')
        .eq('tenant_id', tenant.id)
        .order('name')
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Procedimentos</h1>
        <p className="text-text-secondary">
          Lista de procedimentos que o paciente escolhe ao agendar pelo link público. Desmarque pra
          esconder sem apagar o histórico.
        </p>
      </div>
      <ProcedureTypesForm initial={procedureTypes ?? []} />
    </div>
  )
}
