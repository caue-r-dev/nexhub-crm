import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { NewAnimalForm } from '@/components/animais/NewAnimalForm'

export default async function AnimaisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (nicheSlug !== 'veterinario') notFound()

  const { data: client } = await supabase.from('clients').select('id, name').eq('id', id).single()
  if (!client) notFound()

  const { data: animals } = await supabase
    .from('animals')
    .select('id, name, species, breed, hospitalized')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">{client.name} — animais</h1>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {animals?.length ? (
          animals.map((a) => (
            <Link
              key={a.id}
              href={`/clientes/${id}/animais/${a.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
            >
              <div>
                <p className="font-medium text-text">{a.name}</p>
                <p className="text-xs text-text-secondary">
                  {[a.species, a.breed].filter(Boolean).join(' · ') || 'Sem espécie/raça informada'}
                </p>
              </div>
              {a.hospitalized && (
                <span className="rounded-full bg-status-cancelled/15 px-2.5 py-1 text-xs font-medium text-status-cancelled">
                  Internado
                </span>
              )}
            </Link>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-text-secondary">Nenhum animal cadastrado ainda.</p>
        )}
      </div>

      <NewAnimalForm clientId={id} />
    </div>
  )
}
