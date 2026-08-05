'use client'

import { useState, useTransition } from 'react'
import { createBudgetAction } from '@/app/actions/treatment-budgets'
import { UPPER_TEETH, LOWER_TEETH } from '@/lib/odontogram'
import type { BudgetItem } from '@/lib/supabase/types'

const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH]
const FACES = ['M', 'D', 'V', 'L', 'O'] as const
const FACE_LABEL: Record<(typeof FACES)[number], string> = {
  M: 'Mesial',
  D: 'Distal',
  V: 'Vestibular',
  L: 'Lingual/Palatina',
  O: 'Oclusal/Incisal',
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function emptyItem(): BudgetItem {
  return { description: '', quantity: 1, unit_price: 0, tooth_number: '', faces: [] }
}

export function TreatmentBudgetForm({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<BudgetItem[]>([emptyItem()])
  const [downPayment, setDownPayment] = useState(0)
  const [installments, setInstallments] = useState(1)
  const [discount, setDiscount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const total = Math.max(0, subtotal - discount)

  function updateItem(index: number, patch: Partial<BudgetItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function toggleFace(index: number, face: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const faces = it.faces ?? []
        return {
          ...it,
          faces: faces.includes(face) ? faces.filter((f) => f !== face) : [...faces, face],
        }
      })
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const valid = items.filter((i) => i.description.trim())
    startTransition(async () => {
      const result = await createBudgetAction(clientId, {
        items: valid,
        downPayment,
        installments,
        discount,
      })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setItems([emptyItem()])
        setDownPayment(0)
        setInstallments(1)
        setDiscount(0)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-text">Novo orçamento</h2>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex gap-2">
              <input
                placeholder="Descrição"
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <select
                className="w-24 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.tooth_number}
                onChange={(e) => updateItem(i, { tooth_number: e.target.value })}
              >
                <option value="">Dente</option>
                {ALL_TEETH.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="w-16 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.quantity}
                onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-24 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.unit_price}
                onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="text-status-cancelled">
                  ✕
                </button>
              )}
            </div>

            {item.tooth_number && (
              <div className="flex flex-wrap gap-3">
                {FACES.map((face) => (
                  <label key={face} className="flex items-center gap-1 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={(item.faces ?? []).includes(face)}
                      onChange={() => toggleFace(i, face)}
                    />
                    {FACE_LABEL[face]}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addItem} className="self-start text-sm font-medium text-accent">
        + Adicionar item
      </button>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Entrada (R$)</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Parcelas</span>
          <input
            type="number"
            min={1}
            className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Desconto (R$)</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="flex flex-col items-end gap-0.5 text-sm">
        <span className="text-text-secondary">Subtotal: {formatBRL(subtotal)}</span>
        {discount > 0 && <span className="text-text-secondary">Desconto: -{formatBRL(discount)}</span>}
        <span className="font-semibold text-text">Total: {formatBRL(total)}</span>
      </div>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !items.some((i) => i.description.trim())}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Criar orçamento'}
      </button>
    </form>
  )
}
