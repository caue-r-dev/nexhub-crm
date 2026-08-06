import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalForm } from '@/components/agenda/ProfessionalForm'

export default async function EditarProfissionalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: professional } = await supabase.from('professionals').select('*').eq('id', id).single()
  if (!professional) notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Editar profissional</h1>
      <ProfessionalForm
        professionalId={professional.id}
        initial={{ name: professional.name, color: professional.color, active: professional.active }}
      />
    </div>
  )
}
