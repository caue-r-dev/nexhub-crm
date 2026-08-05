'use client'

import { useTransition } from 'react'
import { updateAppointmentStatusAction } from '@/app/actions/appointments'
import type { AppointmentStatus } from '@/lib/supabase/types'

const OPTIONS: { value: AppointmentStatus; label: string; dot: string }[] = [
  { value: 'pending', label: 'Pendente', dot: 'bg-status-pending' },
  { value: 'confirmed', label: 'Confirmado', dot: 'bg-status-confirmed' },
  { value: 'cancelled', label: 'Cancelado', dot: 'bg-status-cancelled' },
  { value: 'done', label: 'Realizado', dot: 'bg-text-secondary' },
  { value: 'no_show', label: 'Faltou', dot: 'bg-text-secondary' },
]

export function StatusSelect({ id, status }: { id: string; status: AppointmentStatus }) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as AppointmentStatus
        startTransition(async () => {
          await updateAppointmentStatusAction(id, next)
        })
      }}
      className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
