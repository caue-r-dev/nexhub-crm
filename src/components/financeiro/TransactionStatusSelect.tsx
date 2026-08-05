'use client'

import { useTransition } from 'react'
import { updateTransactionStatusAction } from '@/app/actions/transactions'
import type { TransactionStatus } from '@/lib/supabase/types'

const OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: 'receivable', label: 'A receber' },
  { value: 'received', label: 'Recebido' },
  { value: 'overdue', label: 'Vencido' },
]

export function TransactionStatusSelect({ id, status }: { id: string; status: TransactionStatus }) {
  const [isPending, startTransition] = useTransition()

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
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
