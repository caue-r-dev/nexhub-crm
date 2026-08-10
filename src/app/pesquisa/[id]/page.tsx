import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { SurveyFlow } from './SurveyFlow'

export default async function PesquisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: survey } = await admin
    .from('satisfaction_surveys')
    .select('id, responded_at, tenants(name, google_review_link)')
    .eq('id', id)
    .single()

  if (!survey) notFound()

  const tenant = survey.tenants as unknown as { name: string; google_review_link: string | null } | null
  if (!tenant) notFound()

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <SurveyFlow
        surveyId={id}
        tenantName={tenant.name}
        googleReviewLink={tenant.google_review_link}
        alreadyResponded={!!survey.responded_at}
      />
    </div>
  )
}
