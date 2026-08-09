'use client'

import { useState, useTransition } from 'react'
import { createServiceAction, toggleServiceAction } from '@/app/actions/services'

type Service = { id: string; name: string; default_value: number; active: boolean }

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ServicesForm({ initial }: { initial: Service[] }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createServiceAction(name, Number(value) || 0)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setValue('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-text">Novo serviço</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Restauração em resina"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-sm font-medium text-text">Valor</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
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
        {initial.map((s) => (
          <label key={s.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-text">
              {s.name} <span className="text-text-secondary">— {formatBRL(s.default_value)}</span>
            </span>
            <input
              type="checkbox"
              checked={s.active}
              onChange={(e) =>
                startTransition(async () => {
                  await toggleServiceAction(s.id, e.target.checked)
                })
              }
            />
          </label>
        ))}
      </div>
    </div>
  )
}
