'use client'

import { useState, useTransition } from 'react'
import { updateBusinessHoursAction } from '@/app/actions/business-hours'
import type { BusinessHours } from '@/lib/supabase/types'

const DAYS: { key: keyof BusinessHours; label: string }[] = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
]

export function BusinessHoursForm({ initial }: { initial: BusinessHours }) {
  const [hours, setHours] = useState<BusinessHours>(initial)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateDay(day: keyof BusinessHours, patch: Partial<BusinessHours[typeof day]>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateBusinessHoursAction(hours)
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
        {DAYS.map(({ key, label }) => {
          const day = hours[key]
          return (
            <div key={key} className="flex items-center gap-3 px-4 py-3">
              <label className="flex w-40 items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.active}
                  onChange={(e) => updateDay(key, { active: e.target.checked })}
                />
                <span className="text-sm text-text">{label}</span>
              </label>
              <input
                type="time"
                disabled={!day.active}
                value={day.start}
                onChange={(e) => updateDay(key, { start: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
              />
              <span className="text-text-secondary">até</span>
              <input
                type="time"
                disabled={!day.active}
                value={day.end}
                onChange={(e) => updateDay(key, { end: e.target.value })}
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
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
