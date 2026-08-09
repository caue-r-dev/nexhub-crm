'use client'

import { useState, useTransition } from 'react'
import { updateProfessionalHoursAction, type ProfessionalHourInput } from '@/app/actions/professional-hours'

const WEEKDAYS = [
  { weekday: 1, label: 'Segunda-feira' },
  { weekday: 2, label: 'Terça-feira' },
  { weekday: 3, label: 'Quarta-feira' },
  { weekday: 4, label: 'Quinta-feira' },
  { weekday: 5, label: 'Sexta-feira' },
  { weekday: 6, label: 'Sábado' },
  { weekday: 0, label: 'Domingo' },
]

function buildInitial(existing: { weekday: number; start_time: string; end_time: string }[]): ProfessionalHourInput[] {
  return WEEKDAYS.map(({ weekday }) => {
    const found = existing.find((e) => e.weekday === weekday)
    return {
      weekday,
      active: !!found,
      start: found?.start_time.slice(0, 5) ?? '09:00',
      end: found?.end_time.slice(0, 5) ?? '18:00',
    }
  })
}

export function ProfessionalHoursForm({
  professionalId,
  existing,
}: {
  professionalId: string
  existing: { weekday: number; start_time: string; end_time: string }[]
}) {
  const [days, setDays] = useState<ProfessionalHourInput[]>(buildInitial(existing))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function updateDay(weekday: number, patch: Partial<ProfessionalHourInput>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateProfessionalHoursAction(professionalId, days)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {WEEKDAYS.map(({ weekday, label }) => {
          const day = days.find((d) => d.weekday === weekday)!
          return (
            <div key={weekday} className="flex items-center gap-3 px-4 py-3">
              <label className="flex w-40 items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.active}
                  onChange={(e) => updateDay(weekday, { active: e.target.checked })}
                />
                <span className="text-sm text-text">{label}</span>
              </label>
              <input
                type="time"
                disabled={!day.active}
                value={day.start}
                onChange={(e) => updateDay(weekday, { start: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
              />
              <span className="text-text-secondary">até</span>
              <input
                type="time"
                disabled={!day.active}
                value={day.end}
                onChange={(e) => updateDay(weekday, { end: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
              />
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar horários'}
      </button>
    </form>
  )
}
