'use client'

import { useAgendaModal } from './AgendaModalContext'
import { AppointmentModal } from './AppointmentModal'

type Client = { id: string; name: string; phone?: string | null }
type Label = { id: string; name: string; color: string }
type Professional = { id: string; name: string }
type Package = { id: string; client_id: string; service_name: string; used_sessions: number; total_sessions: number }
type ProfessionalHour = { professional_id: string; weekday: number; start_time: string; end_time: string }
type ExistingAppt = { professional_id: string | null; datetime: string; duration_min: number }

export function AppointmentModalHost(props: {
  clients: Client[]
  labels: Label[]
  professionals: Professional[]
  packages: Package[]
  professionalHours: ProfessionalHour[]
  existingAppointments: ExistingAppt[]
}) {
  const { state, closeModal } = useAgendaModal()
  if (!state.open) return null

  return (
    <AppointmentModal
      {...props}
      initialDatetime={state.datetime}
      initialProfessionalId={state.professionalId}
      onClose={closeModal}
    />
  )
}
