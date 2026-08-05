import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { TreatmentForm } from '@/components/tratamentos/TreatmentForm'
import { TreatmentStatusSelect } from '@/components/tratamentos/TreatmentStatusSelect'

export default async function TratamentosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const [{ data: treatments }, { data: budgets }] = await Promise.all([
    supabase.from('treatments').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('treatment_budgets').select('id, total, created_at').eq('client_id', id).order('created_at', { ascending: false }),
  ])

  const budgetOptions = (budgets ?? []).map((b) => ({
    id: b.id,
    label: `${new Date(b.created_at).toLocaleDateString('pt-BR')} — ${b.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
  }))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="tratamentos" />

      <TreatmentForm clientId={id} budgets={budgetOptions} />

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {treatments?.length ? (
          treatments.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-text">{t.procedure}</span>
              <TreatmentStatusSelect id={t.id} clientId={id} status={t.status} />
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-text-secondary">Nenhum tratamento ainda.</p>
        )}
      </div>
    </div>
  )
}
