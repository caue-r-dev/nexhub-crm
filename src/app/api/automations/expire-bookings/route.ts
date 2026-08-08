// Chamado pelo n8n (cron a cada ~15min) — cancela agendamentos vindos do
// link público cujo sinal não foi pago dentro do prazo (tenants.booking_hold_minutes),
// liberando o horário pros próximos. Reusa cancelAppointment, que já marca
// status='cancelled' e avisa o paciente por WhatsApp.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelAppointment } from '@/lib/appointment-automation'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: expired, error } = await admin
    .from('appointments')
    .select('id')
    .eq('source', 'public_booking')
    .eq('payment_status', 'aguardando')
    .not('booking_expires_at', 'is', null)
    .lt('booking_expires_at', now)
    .neq('status', 'cancelled')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { appointmentId: string; ok: boolean; error?: string }[] = []

  for (const appt of expired ?? []) {
    const result = await cancelAppointment(appt.id)
    results.push({ appointmentId: appt.id, ok: !('error' in result), error: 'error' in result ? result.error : undefined })
  }

  return NextResponse.json({ results })
}
