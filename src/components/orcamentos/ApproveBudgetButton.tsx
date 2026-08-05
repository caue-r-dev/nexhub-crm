'use client'

import { useTransition } from 'react'
import { approveBudgetAction } from '@/app/actions/treatment-budgets'

export function ApproveBudgetButton({ id, clientId }: { id: string; clientId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await approveBudgetAction(id, clientId) })}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text disabled:opacity-40"
    >
      {isPending ? 'Aprovando...' : 'Aprovar'}
    </button>
  )
}
