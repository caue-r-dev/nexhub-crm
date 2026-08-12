import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Cake, FileText, Phone, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BR_TZ } from '@/lib/date-range'
import { getCurrentTenant, getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ClientTabs } from '@/components/clientes/ClientTabs'
import { ClientPhotoUpload } from '@/components/clientes/ClientPhotoUpload'
import { ClientDocuments } from '@/components/clientes/ClientDocuments'
import { ClinicalDocumentGenerator } from '@/components/clientes/ClinicalDocumentGenerator'
import { ATESTADO_RECEITA_NICHES } from '@/lib/niche-features'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  done: 'Realizado',
  no_show: 'Faltou',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-status-pending',
  confirmed: 'bg-status-confirmed',
  cancelled: 'bg-status-cancelled',
  done: 'bg-text-secondary',
  no_show: 'bg-text-secondary',
}

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  const tenant = await getCurrentTenant()

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const initials = client.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', id)
    .order('datetime', { ascending: false })
    .limit(10)

  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .eq('client_id', id)
    .order('purchased_at', { ascending: false })

  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">{client.name}</h1>
        <Link
          href={`/clientes/${id}/editar`}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text"
        >
          Editar
        </Link>
      </div>

      <ClientTabs clientId={id} active="ficha" nicheSlug={nicheSlug} />

      {tenant && (
        <ClientPhotoUpload clientId={id} tenantId={tenant.id} initialPhotoPath={client.photo_path} initials={initials} />
      )}

      <div className="grid max-w-md grid-cols-2 gap-5 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start gap-2.5">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <p className="text-xs text-text-secondary">Telefone</p>
            <p className="text-text">{client.phone ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <p className="text-xs text-text-secondary">Documento</p>
            <p className="text-text">{client.document ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Cake className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <p className="text-xs text-text-secondary">Nascimento</p>
            <p className="text-text">{client.birth_date ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <p className="text-xs text-text-secondary">Convênio</p>
            <p className="text-text">{client.convenio ?? 'Particular'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Pacotes</h2>
          <Link href={`/clientes/${id}/pacotes/novo`} className="text-sm font-medium text-accent">
            + Novo pacote
          </Link>
        </div>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {packages?.length ? (
            packages.map((p) => {
              const expired = !!p.expires_at && p.expires_at < new Date().toISOString().slice(0, 10)
              const finished = p.used_sessions >= p.total_sessions
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{p.service_name}</p>
                    {p.expires_at && (
                      <p className={`text-xs ${expired ? 'text-status-cancelled' : 'text-text-secondary'}`}>
                        Válido até {new Date(`${p.expires_at}T00:00:00`).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${finished ? 'text-status-cancelled' : 'text-text'}`}
                  >
                    {p.used_sessions}/{p.total_sessions} sessões
                  </span>
                </div>
              )
            })
          ) : (
            <p className="px-4 py-6 text-center text-text-secondary">Nenhum pacote ainda.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Últimos agendamentos</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {appointments?.length ? (
            appointments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[a.status]}`} />
                <span className="text-text">
                  {new Date(a.datetime).toLocaleString('pt-BR', { timeZone: BR_TZ })}
                </span>
                <span className="ml-auto text-sm text-text-secondary">
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-text-secondary">Nenhum agendamento ainda.</p>
          )}
        </div>
      </div>

      {tenant && <ClientDocuments clientId={id} tenantId={tenant.id} />}

      {nicheSlug && ATESTADO_RECEITA_NICHES.has(nicheSlug) && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-text">Atestado / Receita</h2>
          <ClinicalDocumentGenerator clientId={id} professionals={professionals ?? []} />
        </div>
      )}
    </div>
  )
}
