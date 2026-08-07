import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { TenantAdminForm } from '@/components/admin/TenantAdminForm'
import { TenantUsersPanel } from '@/components/admin/TenantUsersPanel'

export default async function AdminTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('*, niches(label)').eq('id', id).single()
  if (!tenant) notFound()

  const { data: users } = await admin.from('users').select('id, email').eq('tenant_id', id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{tenant.name}</h1>
        <p className="text-text-secondary">{(tenant.niches as { label: string } | null)?.label}</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
        <span className="text-sm font-medium text-text">WhatsApp / Atendimento</span>
        <span className={`text-sm ${tenant.chatwoot_account_id ? 'font-medium text-status-confirmed' : 'text-text-secondary'}`}>
          {tenant.chatwoot_account_id ? 'Conectado' : 'Não conectado — o próprio cliente conecta na aba Atendimento'}
        </span>
      </div>

      <TenantUsersPanel users={users ?? []} />

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
