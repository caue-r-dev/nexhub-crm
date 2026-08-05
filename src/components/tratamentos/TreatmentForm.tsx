'use client'

import { useState, useTransition } from 'react'
import { createTreatmentAction } from '@/app/actions/treatments'

export function TreatmentForm({
  clientId,
  budgets,
}: {
  clientId: string
  budgets: { id: string; label: string }[]
}) {
  const [procedure, setProcedure] = useState('')
  const [budgetId, setBudgetId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createTreatmentAction(clientId, { procedure, budgetId })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setProcedure('')
        setBudgetId('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-text">Novo tratamento</h2>

      <input
        placeholder="Procedimento"
        className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
        value={procedure}
        onChange={(e) => setProcedure(e.target.value)}
      />

      {budgets.length > 0 && (
        <select
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          value={budgetId}
          onChange={(e) => setBudgetId(e.target.value)}
        >
          <option value="">Sem orçamento vinculado</option>
          {budgets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !procedure.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Criar tratamento'}
      </button>
    </form>
  )
}
