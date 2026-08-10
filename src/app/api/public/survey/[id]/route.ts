import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json()) as { rating?: number; feedback?: string }

  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: 'Avaliação inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: survey } = await admin.from('satisfaction_surveys').select('id').eq('id', id).single()
  if (!survey) {
    return NextResponse.json({ error: 'Pesquisa não encontrada.' }, { status: 404 })
  }

  const { error } = await admin
    .from('satisfaction_surveys')
    .update({
      rating: body.rating,
      feedback: body.feedback?.trim() || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
