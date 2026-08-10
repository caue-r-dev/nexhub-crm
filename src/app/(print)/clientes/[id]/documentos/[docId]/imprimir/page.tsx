import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { PrintButton } from '@/components/orcamentos/PrintButton'

const TITLE: Record<string, string> = {
  atestado: 'Atestado',
  receita: 'Receituário',
}

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
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

  const { data: client } = await supabase.from('clients').select('name, document').eq('id', id).single()
  if (!client) notFound()

  const { data: doc } = await supabase
    .from('clinical_documents')
    .select('type, content, created_at, professional_id, cid, exam_date, start_time, end_time, convalescence, convalescence_period')
    .eq('id', docId)
    .eq('client_id', id)
    .single()
  if (!doc) notFound()

  let professional: { name: string; registration_number: string | null; role: string | null } | null = null
  if (doc.professional_id) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('name, registration_number, role')
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
          {professional && (
            <p className="text-sm font-medium text-text">
              {professional.name}
              {professional.role && ` — ${professional.role}`}
              {professional.registration_number && ` — ${professional.registration_number}`}
            </p>
          )}
          <div className="flex flex-col text-sm text-text-secondary">
            {tenant.phone && <span>{tenant.phone}</span>}
            {tenant.address && <span>{tenant.address}</span>}
          </div>
        </header>

        <h2 className="text-center text-xl font-semibold uppercase tracking-wide">{TITLE[doc.type]}</h2>

        <p className="text-sm text-text-secondary">
          Paciente: <strong className="text-text">{client.name}</strong>
          {client.document && (
            <>
              {' '}— CPF: <strong className="text-text">{client.document}</strong>
            </>
          )}
        </p>

        {doc.type === 'atestado' ? (
          <div className="flex flex-col gap-4">
            <p className="leading-relaxed">
              Atesto para os devidos fins que <strong>{client.name}</strong>
              {client.document && (
                <>
                  , portador(a) do documento <strong>{client.document}</strong>
                </>
              )}
              , esteve sob meus cuidados profissionais
              {doc.start_time && doc.end_time && (
                <>
                  {' '}
                  no período das <strong>{doc.start_time}</strong> às <strong>{doc.end_time}</strong> horas
                </>
              )}
              {doc.exam_date && (
                <>
                  {' '}
                  do dia <strong>{formatDateBR(doc.exam_date)}</strong>
                </>
              )}
              {doc.cid && (
                <>
                  . CID: <strong>{doc.cid}</strong>
                </>
              )}
              .
            </p>

            <p>
              Necessita de convalescença? <strong>{doc.convalescence ? 'Sim' : 'Não'}</strong>
              {doc.convalescence && doc.convalescence_period && (
                <>
                  {' '}
                  — Período: <strong>{doc.convalescence_period}</strong>
                </>
              )}
            </p>

            {doc.content && <p className="whitespace-pre-wrap leading-relaxed">{doc.content}</p>}
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{doc.content.replace(/{{\s*nome\s*}}/g, client.name)}</p>
        )}

        <p className="text-right text-sm text-text-secondary">{dateLabel}</p>

        <footer className="mt-16 flex items-end justify-around gap-8 text-center text-sm text-text-secondary">
          {doc.type === 'atestado' && (
            <div className="flex flex-1 flex-col items-center gap-1">
              <span className="w-full border-t border-text-secondary pt-1">{client.name}</span>
              <span>Paciente</span>
            </div>
          )}
          {professional && (
            <div className="flex flex-1 flex-col items-center gap-1">
              <span className="w-full border-t border-text-secondary pt-1">{professional.name}</span>
              {professional.registration_number && <span>{professional.registration_number}</span>}
            </div>
          )}
        </footer>

        {(tenant.email || tenant.address || tenant.cnpj || tenant.social_media) && (
          <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-border pt-3 text-center text-xs text-text-secondary print:fixed print:bottom-4 print:left-0 print:right-0">
            {tenant.phone && <span>{tenant.phone}</span>}
            {tenant.email && <span>{tenant.email}</span>}
            {tenant.address && <span>{tenant.address}</span>}
            {tenant.cnpj && <span>CNPJ {tenant.cnpj}</span>}
            {tenant.social_media && <span>{tenant.social_media}</span>}
          </div>
        )}
      </div>
    </>
  )
}
