'use client'

import { useTransition } from 'react'
import { updateTreatmentStatusAction } from '@/app/actions/treatments'
import type { TreatmentStatus } from '@/lib/supabase/types'

const OPTIONS: { value: TreatmentStatus; label: string }[] = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
]

export function TreatmentStatusSelect({
  id,
  clientId,
  status,
}: {
  id: string
  clientId: string
  status: TreatmentStatus
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as TreatmentStatus
        startTransition(async () => {
          await updateTreatmentStatusAction(id, clientId, next)
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
