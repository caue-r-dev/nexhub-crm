import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { GoogleReviewLinkForm } from '@/components/configuracoes/GoogleReviewLinkForm'

const STARS = '★★★★★'

export default async function SatisfacaoConfigPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const { data: responses } = tenant
    ? await supabase
        .from('satisfaction_surveys')
        .select('id, rating, feedback, responded_at, clients(name)')
        .eq('tenant_id', tenant.id)
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pesquisa de satisfação</h1>
          <p className="text-text-secondary">
            Ao marcar uma consulta como &quot;Realizado&quot;, o paciente recebe um link por WhatsApp
            pedindo uma nota de 1 a 5. Nota 4 ou 5 leva direto pra avaliação no Google — nota 3 ou
            menos vira feedback privado, só pra você ver aqui.
          </p>
        </div>
        {tenant && <GoogleReviewLinkForm initialLink={tenant.google_review_link ?? ''} />}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Respostas recebidas</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {responses?.length ? (
            responses.map((r) => {
              const client = r.clients as unknown as { name: string } | null
              return (
                <div key={r.id} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text">{client?.name ?? 'Cliente removido'}</span>
                    <span style={{ color: 'var(--accent)' }}>{STARS.slice(0, r.rating ?? 0)}</span>
                  </div>
                  {r.feedback && <p className="text-sm text-text-secondary">{r.feedback}</p>}
                  <span className="text-xs text-text-secondary">
                    {r.responded_at && new Date(r.responded_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )
            })
          ) : (
            <p className="px-4 py-6 text-center text-text-secondary">Nenhuma resposta ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
