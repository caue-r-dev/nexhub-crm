import { createClient } from '@/lib/supabase/server'
import { AppointmentForm } from '@/components/agenda/AppointmentForm'

export default async function NovoAgendamentoPage() {
  const supabase = await createClient()
  const [{ data: clients }, { data: labels }, { data: professionals }, { data: packages }] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('appointment_labels').select('id, name, color').order('name'),
    supabase.from('professionals').select('id, name').eq('active', true).order('name'),
    supabase
      .from('packages')
      .select('id, client_id, service_name, used_sessions, total_sessions')
      .order('purchased_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo agendamento</h1>
      <AppointmentForm
        clients={clients ?? []}
        labels={labels ?? []}
        professionals={professionals ?? []}
        packages={packages ?? []}
      />
    </div>
  )
}
