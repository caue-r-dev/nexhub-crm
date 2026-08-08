import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingFlow } from './BookingFlow'

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id, name, slug').eq('slug', slug).single()
  if (!tenant) notFound()

  const { data: professionals } = await admin
    .from('professionals')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  const { data: procedureTypes } = await admin
    .from('procedure_types')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">Agendar consulta — {tenant.name}</h1>
        <p className="text-text-secondary">Escolha o profissional, o procedimento e um horário disponível.</p>
      </div>
      <BookingFlow
        slug={slug}
        professionals={professionals ?? []}
        procedureTypes={procedureTypes ?? []}
      />
    </div>
  )
}
