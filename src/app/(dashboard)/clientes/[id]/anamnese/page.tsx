import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ANAMNESE_EVOLUCOES_NICHES } from '@/lib/niche-features'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { AnamnesisForm } from '@/components/anamnese/AnamnesisForm'
import type { AnamneseQuestionnaire } from '@/lib/anamnese-questions'

export default async function AnamnesePage({
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

  const { data: anamnesis } = await supabase
    .from('anamnesis')
    .select('questionnaire')
    .eq('client_id', id)
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
      <ClientTabs clientId={id} active="anamnese" nicheSlug={nicheSlug} />
      <AnamnesisForm
        clientId={id}
        initial={anamnesis?.questionnaire as Partial<AnamneseQuestionnaire> | undefined}
        nicheSlug={nicheSlug}
      />
    </div>
  )
}
