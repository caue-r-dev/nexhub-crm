'use client'

import { useTransition } from 'react'
import { upsertProcedureDurationAction } from '@/app/actions/professional-procedure-durations'

type ProcedureType = { id: string; name: string; default_duration_min: number | null }
type Override = { procedure_type_id: string; duration_min: number }

export function ProcedureDurationsForm({
  professionalId,
  procedureTypes,
  overrides,
}: {
  professionalId: string
  procedureTypes: ProcedureType[]
  overrides: Override[]
}) {
  const [isPending, startTransition] = useTransition()

  if (procedureTypes.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum procedimento cadastrado ainda.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {procedureTypes.map((p) => {
        const override = overrides.find((o) => o.procedure_type_id === p.id)
        return (
          <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-text">{p.name}</span>
            <label className="flex items-center gap-1">
              <input
                type="number"
                min={5}
                step={5}
                defaultValue={override?.duration_min ?? ''}
                placeholder={p.default_duration_min ? `${p.default_duration_min} (padrão)` : 'Padrão'}
                disabled={isPending}
                className="w-32 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent disabled:opacity-40"
                onBlur={(e) => {
                  const value = e.target.value ? Number(e.target.value) : null
                  if (value === (override?.duration_min ?? null)) return
                  startTransition(async () => {
                    await upsertProcedureDurationAction(professionalId, p.id, value)
                  })
                }}
              />
              <span className="text-xs text-text-secondary">min</span>
            </label>
          </div>
        )
      })}
    </div>
  )
}
