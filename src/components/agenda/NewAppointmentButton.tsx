'use client'

import { Plus } from 'lucide-react'
import { useAgendaModal } from './AgendaModalContext'

export function NewAppointmentButton() {
  const { openModal } = useAgendaModal()
  return (
    <button
      onClick={() => openModal()}
      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white sm:text-sm"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Novo agendamento</span>
    </button>
  )
}
