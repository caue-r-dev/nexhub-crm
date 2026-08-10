'use client'

import { useState, useTransition } from 'react'
import {
  createProcedureTypeAction,
  toggleProcedureTypeAction,
  updateProcedureTypeDurationAction,
} from '@/app/actions/procedure-types'

type ProcedureType = { id: string; name: string; active: boolean; default_duration_min: number | null }

export function ProcedureTypesForm({ initial }: { initial: ProcedureType[] }) {
  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProcedureTypeAction(name, Number(durationMin) || undefined)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setDurationMin('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-text">Novo procedimento</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Limpeza"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-sm font-medium text-text">Duração (min)</span>
          <input
            type="number"
            min={5}
            step={5}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="30"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          Adicionar
        </button>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {initial.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-text">{p.name}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  step={5}
                  defaultValue={p.default_duration_min ?? ''}
                  placeholder="Padrão"
                  className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  onBlur={(e) => {
                    const value = e.target.value ? Number(e.target.value) : null
                    if (value === p.default_duration_min) return
                    startTransition(async () => {
                      await updateProcedureTypeDurationAction(p.id, value)
                    })
                  }}
                />
                <span className="text-xs text-text-secondary">min</span>
              </label>
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) =>
                  startTransition(async () => {
                    await toggleProcedureTypeAction(p.id, e.target.checked)
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
