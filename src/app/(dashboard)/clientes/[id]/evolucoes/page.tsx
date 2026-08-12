import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ANAMNESE_EVOLUCOES_NICHES } from '@/lib/niche-features'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { EvolutionForm } from '@/components/evolucoes/EvolutionForm'
import { BR_TZ } from '@/lib/date-range'

export default async function EvolucoesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (!nicheSlug || !ANAMNESE_EVOLUCOES_NICHES.has(nicheSlug)) notFound()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const [{ data: evolutions }, { data: appointments }] = await Promise.all([
    supabase.from('evolutions').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id, datetime')
      .eq('client_id', id)
      .order('datetime', { ascending: false })
      .limit(20),
  ])

  const appointmentOptions = (appointments ?? []).map((a) => ({
    id: a.id,
    label: new Date(a.datetime).toLocaleString('pt-BR', { timeZone: BR_TZ }),
  }))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="evolucoes" nicheSlug={nicheSlug} />

      <EvolutionForm clientId={id} appointments={appointmentOptions} />

      <div className="flex flex-col gap-3">
        {evolutions?.length ? (
          evolutions.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
                <span>{new Date(e.created_at).toLocaleString('pt-BR', { timeZone: BR_TZ })}</span>
                {e.professional && <span>· {e.professional}</span>}
              </div>
              <div
                className="text-text [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: e.note }}
              />
            </div>
          ))
        ) : (
          <p className="text-center text-text-secondary">Nenhuma evolução registrada ainda.</p>
        )}
      </div>
    </div>
  )
}
