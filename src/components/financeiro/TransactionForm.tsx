'use client'

import { useState, useTransition } from 'react'
import { createTransactionAction } from '@/app/actions/transactions'
import type { TransactionType } from '@/lib/supabase/types'

export function TransactionForm({ clients, hasConvenio }: { clients: { id: string; name: string }[]; hasConvenio: boolean }) {
  const [type, setType] = useState<TransactionType>('receita')
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [guiaNumber, setGuiaNumber] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createTransactionAction({
        type,
        clientId,
        amount: Number(amount),
        dueDate,
        guiaNumber,
        description,
      })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Tipo</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('receita')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              type === 'receita' ? 'border-accent bg-accent text-white' : 'border-border bg-bg text-text'
            }`}
          >
            Receita (cobrança de cliente)
          </button>
          <button
            type="button"
            onClick={() => setType('despesa')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              type === 'despesa' ? 'border-status-cancelled bg-status-cancelled text-white' : 'border-border bg-bg text-text'
            }`}
          >
            Despesa (insumo, gasto)
          </button>
        </div>
      </label>

      {type === 'receita' ? (
        <>
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
          {hasConvenio && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Número da guia (convênio)</span>
              <input
                placeholder="Se aplicável"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={guiaNumber}
                onChange={(e) => setGuiaNumber(e.target.value)}
              />
            </label>
          )}
        </>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Descrição da despesa</span>
          <input
            placeholder="Ex: compra de insumos, aluguel, energia..."
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      )}

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

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !amount || (type === 'despesa' && !description.trim())}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Adicionar lançamento'}
      </button>
    </form>
  )
}
