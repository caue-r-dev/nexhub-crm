import Link from 'next/link'
import { CircleCheck, Clock, TriangleAlert, Plus, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TransactionStatusSelect } from '@/components/financeiro/TransactionStatusSelect'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default async function FinanceiroPage() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, clients(name)')
    .order('due_date', { ascending: true, nullsFirst: false })

  const rows = transactions ?? []
  const recebido = rows.filter((t) => t.status === 'received').reduce((sum, t) => sum + t.amount, 0)
  const aReceber = rows.filter((t) => t.status === 'receivable').reduce((sum, t) => sum + t.amount, 0)
  const pendencias = rows.filter((t) => t.status === 'overdue').reduce((sum, t) => sum + t.amount, 0)

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Financeiro</h1>
        <Link
          href="/financeiro/novo"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-status-confirmed/10">
            <CircleCheck className="h-5 w-5 text-status-confirmed" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Recebido</p>
            <p className="text-xl font-semibold text-text">{formatBRL(recebido)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">A receber</p>
            <p className="text-xl font-semibold text-text">{formatBRL(aReceber)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-status-cancelled/10">
            <TriangleAlert className="h-5 w-5 text-status-cancelled" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Pendências</p>
            <p className="text-xl font-semibold text-text">{formatBRL(pendencias)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.length ? (
          rows.map((t) => {
            const clientName = (t.clients as { name: string } | null)?.name ?? null
            const isLate = !!t.due_date && t.due_date < todayStr && t.status !== 'received'

            return (
              <div key={t.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {clientName ? initials(clientName) : '—'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text">{clientName ?? 'Sem cliente'}</p>
                  {t.guia_number && (
                    <p className="text-xs text-text-secondary">Guia {t.guia_number}</p>
                  )}
                </div>

                <span className={`text-sm ${isLate ? 'font-medium text-status-cancelled' : 'text-text-secondary'}`}>
                  {t.due_date ? new Date(`${t.due_date}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                </span>

                <span className="w-28 text-right font-medium text-text">{formatBRL(t.amount)}</span>

                <TransactionStatusSelect id={t.id} status={t.status} />
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-text-secondary">
            <Wallet className="h-8 w-8 opacity-40" />
            <p>Nenhum lançamento ainda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
