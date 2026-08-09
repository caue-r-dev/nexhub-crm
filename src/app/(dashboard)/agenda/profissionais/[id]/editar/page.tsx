import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalForm } from '@/components/agenda/ProfessionalForm'
import { ProfessionalHoursForm } from '@/components/agenda/ProfessionalHoursForm'

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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-text">Editar profissional</h1>
        <ProfessionalForm
          professionalId={professional.id}
          initial={{
            name: professional.name,
            color: professional.color,
            active: professional.active,
            registrationNumber: professional.registration_number ?? undefined,
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
    </div>
  )
}
