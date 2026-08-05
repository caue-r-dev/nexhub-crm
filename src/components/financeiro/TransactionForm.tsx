'use client'

import { useState, useTransition } from 'react'
import { createTransactionAction } from '@/app/actions/transactions'

export function TransactionForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [guiaNumber, setGuiaNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createTransactionAction({
        clientId,
        amount: Number(amount),
        dueDate,
        guiaNumber,
      })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Cliente</span>
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Sem cliente vinculado</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Valor (R$)</span>
        <input
          type="number"
          min={0.01}
          step={0.01}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Vencimento</span>
        <input
          type="date"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Número da guia (convênio)</span>
        <input
          placeholder="Se aplicável"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={guiaNumber}
          onChange={(e) => setGuiaNumber(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !amount}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Adicionar lançamento'}
      </button>
    </form>
  )
}
