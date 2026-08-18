import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingFlow } from './BookingFlow'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slug, public_booking_enabled, niche_id, address, latitude, longitude')
    .eq('slug', slug)
    .single()
  if (!tenant) notFound()

  const { data: niche } = await admin.from('niches').select('slug').eq('id', tenant.niche_id).single()
  const terms = nicheTermsFor(niche?.slug ?? null)

  if (!tenant.public_booking_enabled) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-text">{tenant.name}</h1>
        <p className="text-text-secondary">
          Agendamento pelo site está desativado no momento. Fale com a gente pelo WhatsApp pra marcar {terms.bookingWordArticle} {terms.bookingWord}.
        </p>
      </div>
    )
  }

  const { data: professionalsRaw } = await admin
    .from('professionals')
    .select('id, name, role, registration_number, photo_url, bio')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  // Signed URL da foto gerada no servidor (admin client) porque a página
  // pública não tem sessão autenticada pra pedir signed URL do lado do
  // cliente — o bucket client-files é privado.
  const professionals = await Promise.all(
    (professionalsRaw ?? []).map(async (p) => {
      let photoUrl: string | null = null
      if (p.photo_url) {
        const { data: signed } = await admin.storage.from('client-files').createSignedUrl(p.photo_url, 3600)
        photoUrl = signed?.signedUrl ?? null
      }
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        registrationNumber: p.registration_number,
        bio: p.bio,
        photoUrl,
      }
    })
  )

  const { data: procedureTypes } = await admin
    .from('procedure_types')
    .select('id, name, price_label')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  return (
    <BookingFlow
      slug={slug}
      clinicName={tenant.name}
      professionals={professionals}
      procedureTypes={procedureTypes ?? []}
      address={tenant.address}
      latitude={tenant.latitude}
      longitude={tenant.longitude}
      nicheSlug={niche?.slug ?? null}
    />
  )
}
