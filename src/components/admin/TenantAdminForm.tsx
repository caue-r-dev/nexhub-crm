'use client'

import { useState, useTransition } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import {
  updateTenantAdminAction,
  setSubscriptionStatusAction,
  markPaidAction,
  deleteTenantAction,
} from '@/app/actions/admin-tenants'
import type { SubscriptionStatus } from '@/lib/supabase/types'

export function TenantAdminForm({
  tenantId,
  tenantName,
  initial,
}: {
  tenantId: string
  tenantName: string
  initial: {
    trialEndsAt: string
    monthlyPrice: string
    nextDueDate: string
    adminNotes: string
    subscriptionStatus: SubscriptionStatus
  }
}) {
  const [trialEndsAt, setTrialEndsAt] = useState(initial.trialEndsAt)
  const [monthlyPrice, setMonthlyPrice] = useState(initial.monthlyPrice)
  const [nextDueDate, setNextDueDate] = useState(initial.nextDueDate)
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateTenantAdminAction(tenantId, {
        trialEndsAt,
        monthlyPrice: monthlyPrice ? Number(monthlyPrice) : undefined,
        nextDueDate,
        adminNotes,
      })
      if (result && 'error' in result) setError(result.error)
    })
  }

  function runAction(action: () => Promise<{ error: string } | undefined>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result && 'error' in result) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={isPending}
          onClick={() => runAction(() => markPaidAction(tenantId))}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" />
          Renovar assinatura
        </button>
        <button
          disabled={isPending}
          onClick={() => runAction(() => setSubscriptionStatusAction(tenantId, 'active'))}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text disabled:opacity-40"
        >
          Ativar
        </button>
        <button
          disabled={isPending}
          onClick={() => runAction(() => setSubscriptionStatusAction(tenantId, 'cancelled'))}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-status-cancelled disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Trial termina em</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Preço mensal (R$)</span>
          <input
            type="number"
            step="0.01"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={monthlyPrice}
            onChange={(e) => setMonthlyPrice(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Próximo vencimento</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Observações</span>
          <textarea
            rows={4}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-status-cancelled">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>

      <div className="flex flex-col gap-3 rounded-xl border border-status-cancelled p-4">
        <div>
          <p className="text-sm font-medium text-status-cancelled">Zona de risco</p>
          <p className="text-sm text-text-secondary">
            Apaga o tenant e tudo que pertence a ele (clientes, agendamentos, financeiro, contas de
            acesso). Não tem como desfazer.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-secondary">
            Digite <strong className="text-text">{tenantName}</strong> pra confirmar
          </span>
          <input
            className="max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-status-cancelled"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={isPending || deleteConfirmText !== tenantName}
          onClick={() => runAction(() => deleteTenantAction(tenantId))}
          className="flex w-fit items-center gap-2 rounded-lg bg-status-cancelled px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          Apagar tenant
        </button>
      </div>
    </div>
  )
}
