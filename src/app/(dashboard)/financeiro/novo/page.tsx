import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/components/financeiro/TransactionForm'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function NovoLancamentoPage() {
  const supabase = await createClient()
  const [{ data: clients }, nicheSlug] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    getCurrentTenantNicheSlug(),
  ])
  const terms = nicheTermsFor(nicheSlug)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo lançamento</h1>
      <TransactionForm clients={clients ?? []} hasConvenio={terms.hasConvenio} />
    </div>
  )
}
