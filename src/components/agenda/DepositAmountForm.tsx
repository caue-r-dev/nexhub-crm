'use client'

import { useState, useTransition } from 'react'
import { setDepositAmountAction } from '@/app/actions/appointment-payment'

export function DepositAmountForm({ appointmentId, initialAmount }: { appointmentId: string; initialAmount: number | null }) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await setDepositAmountAction(appointmentId, Number(amount))
      if (result && 'error' in result) {
        setError(result.error ?? null)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Valor do sinal</span>
        <input
          type="number"
          min={0.01}
          step="0.01"
          placeholder="0,00"
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !amount || Number(amount) <= 0}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Gerando...' : initialAmount ? 'Atualizar QR' : 'Gerar QR'}
      </button>
      {error && <p className="text-sm text-status-cancelled">{error}</p>}
    </form>
  )
}
