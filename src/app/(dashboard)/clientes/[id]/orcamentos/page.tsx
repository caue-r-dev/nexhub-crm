import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { TreatmentBudgetForm } from '@/components/orcamentos/TreatmentBudgetForm'
import { ApproveBudgetButton } from '@/components/orcamentos/ApproveBudgetButton'
import { DeclineBudgetButton } from '@/components/orcamentos/DeclineBudgetButton'
import type { BudgetItem } from '@/lib/supabase/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function OrcamentosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const { data: budgets } = await supabase
    .from('treatment_budgets')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const { data: services } = await supabase
    .from('services')
    .select('id, name, default_value')
    .eq('active', true)
    .order('name')

  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="orcamentos" nicheSlug={nicheSlug} />

      <TreatmentBudgetForm
        clientId={id}
        services={services ?? []}
        professionals={professionals ?? []}
        isDentist={nicheSlug === 'dentista'}
        isAdvogado={nicheSlug === 'advogado'}
      />

      <div className="flex flex-col gap-3">
        {budgets?.length ? (
          budgets.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {new Date(b.created_at).toLocaleDateString('pt-BR')}
                </span>
                {b.approved_at ? (
                  <span className="text-sm font-medium text-status-confirmed">Aprovado</span>
                ) : b.declined_at ? (
                  <span className="text-sm font-medium text-status-cancelled">Recusado</span>
                ) : (
                  <div className="flex gap-2">
                    <ApproveBudgetButton id={b.id} clientId={id} />
                    <DeclineBudgetButton id={b.id} clientId={id} />
                  </div>
                )}
              </div>
              <ul className="mb-2 flex flex-col gap-1 text-sm text-text">
                {(b.items as BudgetItem[]).map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.description}
                      {item.tooth_number && (
                        <span className="text-text-secondary">
                          {' '}
                          — dente {item.tooth_number}
                          {item.faces?.length ? ` (${item.faces.join(', ')})` : ''}
                        </span>
                      )}
                    </span>
                    <span>{formatBRL(item.quantity * item.unit_price)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-0.5 text-sm text-text-secondary">
                {b.discount > 0 && <span>Desconto: -{formatBRL(b.discount)}</span>}
                {b.down_payment > 0 && <span>Entrada: {formatBRL(b.down_payment)}</span>}
                {b.installments > 1 && (
                  <span>
                    {b.installments}x de {formatBRL((b.total - b.down_payment) / b.installments)}
                  </span>
                )}
              </div>
              <p className="text-right font-semibold text-text">Total: {formatBRL(b.total)}</p>
              <div className="mt-2 flex gap-3 text-xs">
                <a href={`/clientes/${id}/orcamentos/${b.id}/imprimir/total`} target="_blank" rel="noopener" className="text-accent">
                  Imprimir (só valor)
                </a>
                <a href={`/clientes/${id}/orcamentos/${b.id}/imprimir/padrao`} target="_blank" rel="noopener" className="text-accent">
                  Imprimir (padrão)
                </a>
                <a href={`/clientes/${id}/orcamentos/${b.id}/imprimir/completo`} target="_blank" rel="noopener" className="text-accent">
                  Imprimir (completo)
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-text-secondary">Nenhum orçamento ainda.</p>
        )}
      </div>
    </div>
  )
}
