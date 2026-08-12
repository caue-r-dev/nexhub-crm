import { Sidebar } from '@/components/Sidebar'
import { getCurrentTenant, getCurrentTenantNicheSlug } from '@/lib/tenant'

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00Z`).getTime()
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((target - today) / 86400000)
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant()
  const nicheSlug = await getCurrentTenantNicheSlug()
  const relevantDate = tenant?.subscription_status === 'trial' ? tenant.trial_ends_at : tenant?.next_due_date
  const daysLeft = daysUntil(relevantDate ?? null)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar subscription={{ status: tenant?.subscription_status ?? 'trial', daysLeft }} nicheSlug={nicheSlug} />
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
    </div>
  )
}
