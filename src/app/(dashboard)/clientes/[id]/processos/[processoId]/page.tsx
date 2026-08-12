import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { PROCESSOS_NICHES } from '@/lib/niche-features'
import { PrazosPanel } from '@/components/processos/PrazosPanel'

export default async function ProcessoPage({
  params,
}: {
  params: Promise<{ id: string; processoId: string }>
}) {
  const { id, processoId } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (!nicheSlug || !PROCESSOS_NICHES.has(nicheSlug)) notFound()

  const { data: processo } = await supabase.from('processos').select('*').eq('id', processoId).single()
  if (!processo) notFound()

  const { data: prazos } = await supabase
    .from('prazos')
    .select('id, tipo_prazo, data_fatal, status, alerta_dias_antes')
    .eq('processo_id', processoId)
    .order('data_fatal', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{processo.tipo_acao || 'Processo'}</h1>
        <p className="text-sm text-text-secondary">
          {[processo.area_direito, processo.numero_cnj, processo.vara_comarca].filter(Boolean).join(' · ') || 'Sem detalhes adicionais'}
        </p>
      </div>

      <PrazosPanel processoId={processoId} clientId={id} initial={prazos ?? []} />
    </div>
  )
}
