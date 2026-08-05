import { createClient } from '@/lib/supabase/server'
import { AppointmentForm } from '@/components/agenda/AppointmentForm'

export default async function NovoAgendamentoPage() {
  const supabase = await createClient()
  const [{ data: clients }, { data: labels }] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('appointment_labels').select('id, name, color').order('name'),
  ])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo agendamento</h1>
      <AppointmentForm clients={clients ?? []} labels={labels ?? []} />
    </div>
  )
}
