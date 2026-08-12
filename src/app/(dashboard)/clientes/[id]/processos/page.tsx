import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { PROCESSOS_NICHES } from '@/lib/niche-features'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { NewProcessoForm } from '@/components/processos/NewProcessoForm'

export default async function ProcessosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (!nicheSlug || !PROCESSOS_NICHES.has(nicheSlug)) notFound()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const { data: processos } = await supabase
    .from('processos')
    .select('id, tipo_acao, area_direito, numero_cnj, status')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="processos" nicheSlug={nicheSlug} />

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {processos?.length ? (
          processos.map((p) => (
            <Link
              key={p.id}
              href={`/clientes/${id}/processos/${p.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
            >
              <div>
                <p className="font-medium text-text">{p.tipo_acao || 'Processo sem tipo definido'}</p>
                <p className="text-xs text-text-secondary">
                  {[p.area_direito, p.numero_cnj].filter(Boolean).join(' · ') || 'Sem detalhes ainda'}
                </p>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary">
                {p.status}
              </span>
            </Link>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-text-secondary">Nenhum processo cadastrado ainda.</p>
        )}
      </div>

      <NewProcessoForm clientId={id} />
    </div>
  )
}
