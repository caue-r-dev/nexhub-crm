import { getCurrentTenant } from '@/lib/tenant'
import { ClinicProfileForm } from '@/components/configuracoes/ClinicProfileForm'

export default async function ClinicaConfigPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Dados da clínica</h1>
        <p className="text-text-secondary">
          Telefone, e-mail e endereço exibidos no cabeçalho dos documentos (orçamentos impressos).
        </p>
      </div>
      {tenant && (
        <ClinicProfileForm
          initialPhone={tenant.phone ?? ''}
          initialEmail={tenant.email ?? ''}
          initialAddress={tenant.address ?? ''}
        />
      )}
    </div>
  )
}
