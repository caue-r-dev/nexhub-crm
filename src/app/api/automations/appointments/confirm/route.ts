// Chamado manualmente ou pelo n8n quando o admin/automação decide confirmar
// um agendamento. Lógica real vive em src/lib/appointment-automation.ts,
// compartilhada com o webhook de resposta do WhatsApp.
import { NextResponse } from 'next/server'
import { confirmAppointment } from '@/lib/appointment-automation'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const appointmentId = body?.appointmentId
  if (!appointmentId || typeof appointmentId !== 'string') {
    return NextResponse.json({ error: 'appointmentId é obrigatório.' }, { status: 400 })
  }

  const result = await confirmAppointment(appointmentId)
  if ('error' in result) {
    const status = result.error === 'Agendamento não encontrado.' ? 404 : 500
    return NextResponse.json(result, { status })
  }
  return NextResponse.json(result)
}
