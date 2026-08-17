'use client'

import { useTransition } from 'react'
import { updateTransactionStatusAction } from '@/app/actions/transactions'
import type { TransactionStatus, TransactionType } from '@/lib/supabase/types'

const RECEITA_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'receivable', label: 'A receber' },
  { value: 'received', label: 'Recebido' },
  { value: 'overdue', label: 'Vencido' },
]

const DESPESA_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'receivable', label: 'A pagar' },
  { value: 'received', label: 'Pago' },
  { value: 'overdue', label: 'Atrasado' },
]

export function TransactionStatusSelect({
  id,
  status,
  type = 'receita',
}: {
  id: string
  status: TransactionStatus
  type?: TransactionType
}) {
  const [isPending, startTransition] = useTransition()
  const options = type === 'despesa' ? DESPESA_OPTIONS : RECEITA_OPTIONS

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as TransactionStatus
        startTransition(async () => {
          await updateTransactionStatusAction(id, next)
        })
      }}
      className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
