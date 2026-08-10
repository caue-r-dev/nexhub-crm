import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { PrintButton } from '@/components/orcamentos/PrintButton'

const TITLE: Record<string, string> = {
  atestado: 'Atestado Médico',
  receita: 'Receituário',
}

export default async function ImprimirDocumentoClinicoPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>
}) {
  const { id, docId } = await params

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: doc } = await supabase
    .from('clinical_documents')
    .select('type, content, created_at, professional_id')
    .eq('id', docId)
    .eq('client_id', id)
    .single()
  if (!doc) notFound()

  let professional: { name: string; registration_number: string | null } | null = null
  if (doc.professional_id) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('name, registration_number')
      .eq('id', doc.professional_id)
      .maybeSingle()
    professional = prof ?? null
  }

  const dateLabel = new Date(doc.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      <PrintButton />
      <div className="flex flex-col gap-8 text-text">
        <header className="border-b border-border pb-4">
          <h1 className="text-lg font-semibold">{tenant.name}</h1>
          <div className="flex flex-col text-sm text-text-secondary">
            {tenant.phone && <span>{tenant.phone}</span>}
            {tenant.address && <span>{tenant.address}</span>}
          </div>
        </header>

        <h2 className="text-center text-xl font-semibold uppercase tracking-wide">{TITLE[doc.type]}</h2>

        <p className="whitespace-pre-wrap leading-relaxed">{doc.content.replace(/{{\s*nome\s*}}/g, client.name)}</p>

        <p className="text-right text-sm text-text-secondary">{dateLabel}</p>

        <footer className="mt-16 flex flex-col items-center gap-1 border-t border-border pt-4 text-sm text-text-secondary">
          {professional && (
            <>
              <span className="border-t border-text-secondary px-8 pt-1">{professional.name}</span>
              {professional.registration_number && <span>{professional.registration_number}</span>}
            </>
          )}
        </footer>
      </div>
    </>
  )
}
