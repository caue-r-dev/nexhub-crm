import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeFreeSlots, type BusyInterval } from '@/lib/availability'

const BOOKING_WINDOW_DAYS = 14

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
  const rangeFrom = now
  const rangeTo = new Date(now.getTime() + BOOKING_WINDOW_DAYS * 24 * 3600_000)

  const { data: workingHours } = await admin
    .from('professional_hours')
    .select('weekday, start_time, end_time')
    .eq('professional_id', professionalId)

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

  const slots = computeFreeSlots({
    workingHours: (workingHours ?? []).map((h) => ({
      weekday: h.weekday,
      startTime: h.start_time.slice(0, 5),
      endTime: h.end_time.slice(0, 5),
    })),
    busy,
    slotDurationMinutes,
    bufferMinutes: tenant.buffer_minutes,
    rangeFrom,
    rangeTo,
    now,
  })

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) })
}
