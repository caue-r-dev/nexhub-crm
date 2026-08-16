import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeFreeSlots, type BusyInterval } from '@/lib/availability'

const BOOKING_WINDOW_DAYS = 7
// Se a semana atual não tem nenhum horário livre, avança semana a semana
// procurando — até esse limite, pra não virar loop puxando dados de anos
// pra frente quando o profissional simplesmente não tem horário nenhum
// cadastrado.
const MAX_WEEKS_AHEAD = 8

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const professionalId = searchParams.get('professionalId')
  const procedureTypeId = searchParams.get('procedureTypeId')

  if (!professionalId) {
    return NextResponse.json({ error: 'professionalId é obrigatório.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slot_duration_minutes, buffer_minutes')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 })
  }

  let slotDurationMinutes = tenant.slot_duration_minutes
  if (procedureTypeId) {
    const { data: procedureType } = await admin
      .from('procedure_types')
      .select('default_duration_min')
      .eq('id', procedureTypeId)
      .eq('tenant_id', tenant.id)
      .single()
    if (procedureType?.default_duration_min) {
      slotDurationMinutes = procedureType.default_duration_min
    }

    // Duração específica do profissional pra esse procedimento tem
    // prioridade sobre o padrão do procedimento — cada dentista leva um
    // tempo diferente no mesmo procedimento.
    const { data: override } = await admin
      .from('professional_procedure_durations')
      .select('duration_min')
      .eq('professional_id', professionalId)
      .eq('procedure_type_id', procedureTypeId)
      .maybeSingle()
    if (override?.duration_min) {
      slotDurationMinutes = override.duration_min
    }
  }

  const { data: professional } = await admin
    .from('professionals')
    .select('id')
    .eq('id', professionalId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!professional) {
    return NextResponse.json({ error: 'Profissional inválido.' }, { status: 404 })
  }

  const now = new Date()

  const { data: workingHours } = await admin
    .from('professional_hours')
    .select('weekday, start_time, end_time')
    .eq('professional_id', professionalId)

  const parsedWorkingHours = (workingHours ?? []).map((h) => ({
    weekday: h.weekday,
    startTime: h.start_time.slice(0, 5),
    endTime: h.end_time.slice(0, 5),
  }))

  // Semana atual sem vaga nenhuma não deve virar dead-end — avança pra
  // próxima até achar horário livre ou bater o limite de semanas.
  let slots: Date[] = []
  for (let week = 0; week < MAX_WEEKS_AHEAD; week++) {
    const rangeFrom = new Date(now.getTime() + week * BOOKING_WINDOW_DAYS * 24 * 3600_000)
    const rangeTo = new Date(rangeFrom.getTime() + BOOKING_WINDOW_DAYS * 24 * 3600_000)

    const { data: appointments } = await admin
      .from('appointments')
      .select('datetime, duration_min')
      .eq('professional_id', professionalId)
      .in('status', ['pending', 'confirmed'])
      .gte('datetime', rangeFrom.toISOString())
      .lte('datetime', rangeTo.toISOString())

    const busy: BusyInterval[] = (appointments ?? []).map((a) => ({
      start: new Date(a.datetime),
      end: new Date(new Date(a.datetime).getTime() + a.duration_min * 60_000),
    }))

    slots = computeFreeSlots({
      workingHours: parsedWorkingHours,
      busy,
      slotDurationMinutes,
      bufferMinutes: tenant.buffer_minutes,
      rangeFrom,
      rangeTo,
      now,
    })

    if (slots.length > 0) break
  }

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) })
}
