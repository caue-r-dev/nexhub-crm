'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { blockStyle } from '@/lib/agenda-grid'
import { StatusSelect } from './StatusSelect'
import type { AppointmentStatus } from '@/lib/supabase/types'

const STATUS_BG: Record<string, string> = {
  pending: 'color-mix(in srgb, var(--status-pending) 10%, var(--surface))',
  confirmed: 'color-mix(in srgb, var(--status-confirmed) 10%, var(--surface))',
  cancelled: 'color-mix(in srgb, var(--status-cancelled) 10%, var(--surface))',
  done: 'color-mix(in srgb, var(--text-secondary) 10%, var(--surface))',
  no_show: 'color-mix(in srgb, var(--text-secondary) 10%, var(--surface))',
}

const STATUS_BORDER: Record<string, string> = {
  pending: 'var(--status-pending)',
  confirmed: 'var(--status-confirmed)',
  cancelled: 'var(--status-cancelled)',
  done: 'var(--text-secondary)',
  no_show: 'var(--text-secondary)',
}

export type BlockAppointment = {
  id: string
  datetime: string
  duration_min: number
  status: AppointmentStatus
  label: string
  timeLabel: string
}

// Card do bloco de agendamento — redesenho visual pendente (aguardando
// referência do Cauê). Não mudar layout/estrutura fora disso sem necessidade.
export function AppointmentBlock({ appt, tz }: { appt: BlockAppointment; tz: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute right-1 left-1" style={blockStyle(appt.datetime, appt.duration_min, tz)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-full w-full overflow-hidden rounded-md px-2 py-1 text-left transition-shadow hover:shadow-md"
        style={{ backgroundColor: STATUS_BG[appt.status], borderLeft: `3px solid ${STATUS_BORDER[appt.status]}` }}
      >
        <div className="flex items-center gap-1 text-[11px] font-medium text-text">
          <Clock className="h-2.5 w-2.5" style={{ color: STATUS_BORDER[appt.status] }} />
          {appt.timeLabel}
        </div>
        <div className="truncate text-xs font-semibold text-text">{appt.label}</div>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-48 rounded-lg border border-border bg-surface p-2 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="truncate text-xs font-medium text-text">{appt.label}</span>
            <button onClick={() => setOpen(false)} className="shrink-0 text-xs text-text-secondary">
              ✕
            </button>
          </div>
          <StatusSelect id={appt.id} status={appt.status} />
          <Link
            href={`/agenda/${appt.id}/pix`}
            className="mt-2 block rounded-md border border-border px-2 py-1 text-center text-xs font-medium text-text"
          >
            Pix / sinal
          </Link>
        </div>
      )}
    </div>
  )
}
