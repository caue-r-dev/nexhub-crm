'use client'

import { useState, useTransition } from 'react'
import { createPackageAction } from '@/app/actions/packages'

export function PackageForm({ clientId }: { clientId: string }) {
  const [serviceName, setServiceName] = useState('')
  const [totalSessions, setTotalSessions] = useState(10)
  const [price, setPrice] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPackageAction({
        clientId,
        serviceName,
        totalSessions,
        price: price ? Number(price) : undefined,
        expiresAt: expiresAt || undefined,
      })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Serviço</span>
        <input
          placeholder="Ex: Sessão de limpeza de pele"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Total de sessões</span>
        <input
          type="number"
          min={1}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={totalSessions}
          onChange={(e) => setTotalSessions(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Preço (opcional)</span>
        <input
          type="number"
          min={0}
          step="0.01"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Validade (opcional)</span>
        <input
          type="date"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !serviceName.trim() || !totalSessions}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Criar pacote'}
      </button>
    </form>
  )
}
