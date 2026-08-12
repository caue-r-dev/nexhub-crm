import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'

export default async function PrazosGlobalPage() {
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (nicheSlug !== 'advogado') notFound()

  const { data: prazos } = await supabase
    .from('prazos')
    .select('id, tipo_prazo, data_fatal, status, processo_id, processos(id, tipo_acao, client_id, clients(name))')
    .eq('status', 'pendente')
    .order('data_fatal', { ascending: true })

  type PrazoRow = {
    id: string
    tipo_prazo: string
    data_fatal: string
    processo_id: string
    processos: { id: string; tipo_acao: string | null; client_id: string; clients: { name: string } | { name: string }[] | null } | { id: string; tipo_acao: string | null; client_id: string; clients: { name: string } | { name: string }[] | null }[] | null
  }

  const today = new Date().toISOString().slice(0, 10)
  const list = (prazos ?? []) as PrazoRow[]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Prazos pendentes</h1>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {list.length === 0 ? (
          <p className="px-4 py-6 text-center text-text-secondary">Nenhum prazo pendente.</p>
        ) : (
          list.map((p) => {
            const processo = Array.isArray(p.processos) ? p.processos[0] : p.processos
            const clientObj = processo?.clients
            const clientName = Array.isArray(clientObj) ? clientObj[0]?.name : clientObj?.name
            const overdue = p.data_fatal < today
            return (
              <Link
                key={p.id}
                href={processo ? `/clientes/${processo.client_id}/processos/${processo.id}` : '#'}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
              >
                <div>
                  <p className={`font-medium ${overdue ? 'text-status-cancelled' : 'text-text'}`}>{p.tipo_prazo}</p>
                  <p className="text-xs text-text-secondary">
                    {processo?.tipo_acao ?? 'Processo'} {clientName ? `· ${clientName}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium ${overdue ? 'text-status-cancelled' : 'text-text-secondary'}`}>
                  {new Date(`${p.data_fatal}T00:00:00`).toLocaleDateString('pt-BR')}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
