import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantNicheSlug } from '@/lib/tenant'
import { VaccineForm } from '@/components/animais/VaccineForm'
import { HospitalizationPanel } from '@/components/animais/HospitalizationPanel'

export default async function AnimalPage({
  params,
}: {
  params: Promise<{ id: string; animalId: string }>
}) {
  const { id, animalId } = await params
  const supabase = await createClient()
  const nicheSlug = await getCurrentTenantNicheSlug()
  if (nicheSlug !== 'veterinario') notFound()

  const { data: animal } = await supabase.from('animals').select('*').eq('id', animalId).single()
  if (!animal) notFound()

  const { data: vaccines } = await supabase
    .from('animal_vaccines')
    .select('*')
    .eq('animal_id', animalId)
    .order('applied_at', { ascending: false })

  const { data: currentHosp } = await supabase
    .from('animal_hospitalizations')
    .select('id')
    .eq('animal_id', animalId)
    .is('discharged_at', null)
    .order('admitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: hospNotes } = currentHosp
    ? await supabase
        .from('animal_hospitalization_notes')
        .select('id, note, created_at')
        .eq('hospitalization_id', currentHosp.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{animal.name}</h1>
        <p className="text-sm text-text-secondary">
          {[animal.species, animal.breed].filter(Boolean).join(' · ') || 'Sem espécie/raça informada'}
          {animal.weight ? ` · ${animal.weight}kg` : ''}
        </p>
      </div>

      <HospitalizationPanel
        animalId={animalId}
        clientId={id}
        hospitalized={animal.hospitalized}
        currentHospitalizationId={currentHosp?.id ?? null}
        notes={hospNotes ?? []}
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-text">Vacinas</h2>
        <VaccineForm animalId={animalId} />
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {vaccines?.length ? (
            vaccines.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-text">{v.vaccine_name}</p>
                  <p className="text-xs text-text-secondary">
                    Aplicada em {new Date(`${v.applied_at}T00:00:00`).toLocaleDateString('pt-BR')}
                    {v.professional ? ` · ${v.professional}` : ''}
                  </p>
                </div>
                {v.next_dose_at && (
                  <span className="text-xs text-text-secondary">
                    Próxima: {new Date(`${v.next_dose_at}T00:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-sm text-text-secondary">Nenhuma vacina registrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  )
}
