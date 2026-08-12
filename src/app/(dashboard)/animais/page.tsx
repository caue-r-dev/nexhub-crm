import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'

export default async function AnimaisGlobalPage() {
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (nicheSlug !== 'veterinario') notFound()

  const { data: animals } = await supabase
    .from('animals')
    .select('id, name, species, breed, hospitalized, client_id, clients(name)')
    .order('name')

  type AnimalRow = {
    id: string
    name: string
    species: string | null
    breed: string | null
    hospitalized: boolean
    client_id: string
    clients: { name: string } | { name: string }[] | null
  }

  const list = (animals ?? []) as AnimalRow[]
  const hospitalized = list.filter((a) => a.hospitalized)
  const rest = list.filter((a) => !a.hospitalized)

  function row(a: AnimalRow) {
    const tutor = Array.isArray(a.clients) ? a.clients[0]?.name : a.clients?.name
    return (
      <Link
        key={a.id}
        href={`/clientes/${a.client_id}/animais/${a.id}`}
        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg"
      >
        <div>
          <p className="font-medium text-text">{a.name}</p>
          <p className="text-xs text-text-secondary">
            {[a.species, a.breed].filter(Boolean).join(' · ')} {tutor ? `· tutor: ${tutor}` : ''}
          </p>
        </div>
        {a.hospitalized && (
          <span className="rounded-full bg-status-cancelled/15 px-2.5 py-1 text-xs font-medium text-status-cancelled">
            Internado
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Animais</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Internados agora ({hospitalized.length})</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {hospitalized.length ? hospitalized.map(row) : (
            <p className="px-4 py-6 text-center text-text-secondary">Nenhum animal internado agora.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Todos os animais</h2>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {rest.length ? rest.map(row) : (
            <p className="px-4 py-6 text-center text-text-secondary">Nenhum animal cadastrado ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
