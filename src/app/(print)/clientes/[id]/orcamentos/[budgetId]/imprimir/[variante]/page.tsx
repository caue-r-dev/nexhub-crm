import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { BudgetPrintDocument } from '@/components/orcamentos/BudgetPrintDocument'
import { PrintButton } from '@/components/orcamentos/PrintButton'
import type { BudgetItem } from '@/lib/supabase/types'

const VARIANTS = ['total', 'padrao', 'completo'] as const

export default async function ImprimirOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string; budgetId: string; variante: string }>
}) {
  const { id, budgetId, variante } = await params
  if (!VARIANTS.includes(variante as (typeof VARIANTS)[number])) notFound()
  const variant = variante as (typeof VARIANTS)[number]

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: budget } = await supabase
    .from('treatment_budgets')
    .select('created_at, total, items, professional_id')
    .eq('id', budgetId)
    .eq('client_id', id)
    .single()
  if (!budget) notFound()

  let professional: { name: string; registration_number: string | null } | null = null
  if (budget.professional_id) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('name, registration_number')
      .eq('id', budget.professional_id)
      .maybeSingle()
    professional = prof ?? null
  }

  let odontogramRecords: { tooth_number: string; status: import('@/lib/supabase/types').OdontogramStatus }[] = []
  if (variant === 'completo') {
    const { data: records } = await supabase
      .from('odontogram_records')
      .select('tooth_number, status')
      .eq('client_id', id)
    odontogramRecords = records ?? []
  }

  return (
    <>
      <PrintButton />
      <BudgetPrintDocument
        variant={variant}
        tenant={{ name: tenant.name, phone: tenant.phone, email: tenant.email, address: tenant.address }}
        professional={professional}
        client={client}
        budget={{ created_at: budget.created_at, total: budget.total, items: budget.items as BudgetItem[] }}
        odontogramRecords={odontogramRecords}
      />
    </>
  )
}
