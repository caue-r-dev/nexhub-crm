'use client'

import { useState, useTransition } from 'react'
import { createProcedureTypeAction, toggleProcedureTypeAction } from '@/app/actions/procedure-types'

type ProcedureType = { id: string; name: string; active: boolean }

export function ProcedureTypesForm({ initial }: { initial: ProcedureType[] }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProcedureTypeAction(name)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Novo procedimento</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Limpeza"
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
          <label key={p.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-text">{p.name}</span>
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) =>
                startTransition(async () => {
                  await toggleProcedureTypeAction(p.id, e.target.checked)
                })
              }
            />
          </label>
        ))}
      </div>
    </div>
  )
}
