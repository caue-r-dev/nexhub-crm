import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
      <ClientTabs clientId={id} active="anamnese" />
      <AnamnesisForm
        clientId={id}
        initial={anamnesis?.questionnaire as Partial<AnamneseQuestionnaire> | undefined}
      />
    </div>
  )
}
