import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/components/financeiro/TransactionForm'

export default async function NovoLancamentoPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo lançamento</h1>
      <TransactionForm clients={clients ?? []} />
    </div>
  )
}
