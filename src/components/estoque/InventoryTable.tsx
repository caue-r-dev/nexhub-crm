'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import {
  adjustInventoryQuantityAction,
  deleteInventoryItemAction,
  updateInventoryItemAction,
} from '@/app/actions/inventory'

type Item = {
  id: string
  name: string
  quantity: number
  unit: string
  min_quantity: number | null
  expires_at: string | null
  notes: string | null
}

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${dateStr}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-xs text-text-secondary">—</span>
  const days = daysUntil(expiresAt)
  const label = new Date(`${expiresAt}T00:00:00`).toLocaleDateString('pt-BR')

  if (days < 0) {
    return <span className="rounded-full bg-status-cancelled/15 px-2 py-0.5 text-xs font-medium text-status-cancelled">Vencido ({label})</span>
  }
  if (days <= 30) {
    return <span className="rounded-full bg-status-pending/15 px-2 py-0.5 text-xs font-medium text-status-pending">Vence em {days}d ({label})</span>
  }
  return <span className="text-xs text-text-secondary">{label}</span>
}

export function InventoryTable({ items }: { items: Item[] }) {
  const [isPending, startTransition] = useTransition()
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  function adjust(id: string, delta: number) {
    startTransition(async () => {
      await adjustInventoryQuantityAction(id, delta)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteInventoryItemAction(id)
      setConfirmingDeleteId(null)
    })
  }

  if (items.length === 0) {
    return <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-text-secondary">Nenhum produto cadastrado ainda.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((item) => {
        const low = item.min_quantity !== null && item.quantity <= item.min_quantity
        return (
          <div key={item.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[140px] flex-1">
                <p className="font-medium text-text">{item.name}</p>
                {low && <span className="text-xs font-medium text-status-cancelled">Estoque baixo</span>}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjust(item.id, -1)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-16 text-center text-sm text-text">
                  {item.quantity} {item.unit}
                </span>
                <button
                  type="button"
                  onClick={() => adjust(item.id, 1)}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <ExpiryBadge expiresAt={item.expires_at} />

              <button
                type="button"
                onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                className="text-xs font-medium text-accent"
              >
                {editingId === item.id ? 'Fechar' : 'Editar'}
              </button>

              {confirmingDeleteId === item.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="rounded-md bg-status-cancelled px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(null)}
                    className="rounded-md border border-border px-2 py-1 text-xs text-text"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(item.id)}
                  className="text-status-cancelled"
                  title="Apagar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {editingId === item.id && <InlineEditForm item={item} onDone={() => setEditingId(null)} />}
          </div>
        )
      })}
    </div>
  )
}

function InlineEditForm({ item, onDone }: { item: Item; onDone: () => void }) {
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState(item.unit)
  const [minQuantity, setMinQuantity] = useState(item.min_quantity?.toString() ?? '')
  const [expiresAt, setExpiresAt] = useState(item.expires_at ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateInventoryItemAction(item.id, {
        name,
        quantity: item.quantity,
        unit,
        minQuantity: minQuantity ? Number(minQuantity) : null,
        expiresAt: expiresAt || null,
      })
      if (result && 'error' in result) {
        setError(result.error ?? null)
        return
      }
      onDone()
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
      <label className="flex flex-1 min-w-[140px] flex-col gap-1">
        <span className="text-xs text-text-secondary">Nome</span>
        <input className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex w-20 flex-col gap-1">
        <span className="text-xs text-text-secondary">Unid.</span>
        <input className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </label>
      <label className="flex w-28 flex-col gap-1">
        <span className="text-xs text-text-secondary">Estoque mín.</span>
        <input type="number" min={0} step="0.01" className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">Validade</span>
        <input type="date" className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </label>
      <button type="button" onClick={handleSave} disabled={isPending} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
      {error && <p className="w-full text-xs text-status-cancelled">{error}</p>}
    </div>
  )
}
