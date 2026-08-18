import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { ProfessionalForm } from '@/components/agenda/ProfessionalForm'
import { ProfessionalPhotoUpload } from '@/components/agenda/ProfessionalPhotoUpload'
import { ProfessionalHoursForm } from '@/components/agenda/ProfessionalHoursForm'
import { ProcedureDurationsForm } from '@/components/agenda/ProcedureDurationsForm'
import { initials } from '@/lib/professional-colors'

export default async function EditarProfissionalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: professional } = await supabase.from('professionals').select('*').eq('id', id).single()
  if (!professional) notFound()

  const { data: hours } = await supabase
    .from('professional_hours')
    .select('weekday, start_time, end_time')
    .eq('professional_id', id)

  const tenant = await getCurrentTenant()
  const [{ data: procedureTypes }, { data: durationOverrides }] = await Promise.all([
    tenant
      ? supabase.from('procedure_types').select('id, name, default_duration_min').eq('tenant_id', tenant.id).eq('active', true).order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('professional_procedure_durations').select('procedure_type_id, duration_min').eq('professional_id', id),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-text">Editar profissional</h1>
        {tenant && (
          <ProfessionalPhotoUpload
            professionalId={professional.id}
            tenantId={tenant.id}
            initialPhotoPath={professional.photo_url}
            initials={initials(professional.name)}
          />
        )}
        <ProfessionalForm
          professionalId={professional.id}
          initial={{
            name: professional.name,
            color: professional.color,
            active: professional.active,
            registrationNumber: professional.registration_number ?? undefined,
            role: professional.role ?? undefined,
            bio: professional.bio ?? undefined,
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Horário de trabalho</h2>
          <p className="text-text-secondary">Usado pra calcular horários livres no link público de agendamento.</p>
        </div>
        <ProfessionalHoursForm professionalId={professional.id} existing={hours ?? []} />
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Duração por procedimento</h2>
          <p className="text-text-secondary">
            Sobrescreve a duração padrão do procedimento só pra este profissional. Deixe em branco pra
            usar o padrão.
          </p>
        </div>
        <ProcedureDurationsForm
          professionalId={professional.id}
          procedureTypes={procedureTypes ?? []}
          overrides={durationOverrides ?? []}
        />
      </div>
    </div>
  )
}
