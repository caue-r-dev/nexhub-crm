'use client'

import { useState, useTransition } from 'react'
import { createInventoryItemAction } from '@/app/actions/inventory'

export function InventoryForm() {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [unit, setUnit] = useState('un')
  const [minQuantity, setMinQuantity] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createInventoryItemAction({
        name,
        quantity: Number(quantity) || 0,
        unit,
        minQuantity: minQuantity ? Number(minQuantity) : null,
        expiresAt: expiresAt || null,
      })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setQuantity('0')
        setUnit('un')
        setMinQuantity('')
        setExpiresAt('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-1 min-w-[180px] flex-col gap-1">
        <span className="text-sm font-medium text-text">Produto</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Luva de procedimento M"
        />
      </label>
      <label className="flex w-24 flex-col gap-1">
        <span className="text-sm font-medium text-text">Qtd.</span>
        <input
          type="number"
          min={0}
          step="0.01"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </label>
      <label className="flex w-20 flex-col gap-1">
        <span className="text-sm font-medium text-text">Unid.</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </label>
      <label className="flex w-28 flex-col gap-1">
        <span className="text-sm font-medium text-text">Estoque mín.</span>
        <input
          type="number"
          min={0}
          step="0.01"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={minQuantity}
          onChange={(e) => setMinQuantity(e.target.value)}
          placeholder="Opcional"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Validade</span>
        <input
          type="date"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="h-[42px] rounded-lg bg-accent px-4 font-medium text-white disabled:opacity-40"
      >
        Adicionar
      </button>
      {error && <p className="w-full text-sm text-status-cancelled">{error}</p>}
    </form>
  )
}
