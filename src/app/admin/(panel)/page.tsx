import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { GenerateTrialTenantForm } from '@/components/admin/GenerateTrialTenantForm'

const STATUS_LABEL: Record<string, string> = {
  trial: 'Trial',
  active: 'Ativo',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  trial: 'bg-status-pending',
  active: 'bg-status-confirmed',
  overdue: 'bg-status-cancelled',
  cancelled: 'bg-text-secondary',
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00Z`).getTime()
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((target - today) / 86400000)
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient()
  const { data: tenants } = await admin
    .from('tenants')
    .select('*, niches(label)')
    .order('created_at', { ascending: false })

  const rows = tenants ?? []
  const totalActive = rows.filter((t) => t.subscription_status === 'active').length
  const totalTrial = rows.filter((t) => t.subscription_status === 'trial').length
  const totalCancelled = rows.filter((t) => t.subscription_status === 'cancelled').length
  const vencendoEm7 = rows.filter((t) => {
    const relevantDate = t.subscription_status === 'trial' ? t.trial_ends_at : t.next_due_date
    const days = daysUntil(relevantDate)
    return days !== null && days >= 0 && days <= 7
  }).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Tenants</h1>
        <GenerateTrialTenantForm />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-secondary">Ativos</p>
          <p className="text-2xl font-semibold text-status-confirmed">{totalActive}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-secondary">Em trial</p>
          <p className="text-2xl font-semibold text-status-pending">{totalTrial}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-secondary">Vencendo em 7 dias</p>
          <p className="text-2xl font-semibold text-text">{vencendoEm7}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-secondary">Cancelados</p>
          <p className="text-2xl font-semibold text-status-cancelled">{totalCancelled}</p>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.length ? (
          rows.map((t) => {
            const relevantDate = t.subscription_status === 'trial' ? t.trial_ends_at : t.next_due_date
            const days = daysUntil(relevantDate)

            return (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-bg"
              >
                <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[t.subscription_status]}`} />
                <span className="flex-1 font-medium text-text">{t.name}</span>
                <span className="text-sm text-text-secondary">
                  {(t.niches as { label: string } | null)?.label ?? '—'}
                </span>
                <span className="w-20 text-sm text-text-secondary">
                  {STATUS_LABEL[t.subscription_status]}
                </span>
                <span className="w-32 text-right text-sm text-text-secondary">
                  {days === null ? '—' : days >= 0 ? `${days}d restantes` : `${-days}d vencido`}
                </span>
              </Link>
            )
          })
        ) : (
          <p className="px-4 py-6 text-center text-text-secondary">Nenhum tenant ainda.</p>
        )}
      </div>
    </div>
  )
}
