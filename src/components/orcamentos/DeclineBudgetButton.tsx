'use client'

import { useTransition } from 'react'
import { declineBudgetAction } from '@/app/actions/treatment-budgets'

export function DeclineBudgetButton({ id, clientId }: { id: string; clientId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await declineBudgetAction(id, clientId) })}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-40"
    >
      {isPending ? 'Marcando...' : 'Marcar como recusado'}
    </button>
  )
}
