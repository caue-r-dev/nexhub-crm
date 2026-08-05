import { getCurrentTenant } from '@/lib/tenant'
import { BusinessHoursForm } from '@/components/configuracoes/BusinessHoursForm'

export default async function HorariosPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Horário de funcionamento</h1>
        <p className="text-text-secondary">Define os dias e horários usados pela Agenda.</p>
      </div>
      {tenant && <BusinessHoursForm initial={tenant.business_hours} />}
    </div>
  )
}
