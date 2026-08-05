import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { TenantAdminForm } from '@/components/admin/TenantAdminForm'

export default async function AdminTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('*, niches(label)').eq('id', id).single()
  if (!tenant) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{tenant.name}</h1>
        <p className="text-text-secondary">{(tenant.niches as { label: string } | null)?.label}</p>
      </div>

      <TenantAdminForm
        tenantId={tenant.id}
        initial={{
          trialEndsAt: tenant.trial_ends_at?.slice(0, 10) ?? '',
          monthlyPrice: tenant.monthly_price?.toString() ?? '',
          nextDueDate: tenant.next_due_date ?? '',
          adminNotes: tenant.admin_notes ?? '',
          subscriptionStatus: tenant.subscription_status,
        }}
      />
    </div>
  )
}
