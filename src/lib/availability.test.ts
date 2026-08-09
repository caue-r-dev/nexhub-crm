import { describe, it, expect } from 'vitest'
import { computeFreeSlots, type WorkingHour, type BusyInterval } from './availability'

// Segunda-feira 2026-08-10, 09:00-12:00, slot de 30min, sem buffer
const MONDAY: WorkingHour[] = [{ weekday: 1, startTime: '09:00', endTime: '12:00' }]

function d(iso: string) {
  return new Date(iso)
}

describe('computeFreeSlots', () => {
  it('retorna todos os slots do dia quando não há conflito', () => {
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy: [],
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-01T00:00:00-03:00'),
    })
    expect(slots.map((s) => s.toISOString())).toEqual([
      d('2026-08-10T09:00:00-03:00').toISOString(),
      d('2026-08-10T09:30:00-03:00').toISOString(),
      d('2026-08-10T10:00:00-03:00').toISOString(),
      d('2026-08-10T10:30:00-03:00').toISOString(),
      d('2026-08-10T11:00:00-03:00').toISOString(),
      d('2026-08-10T11:30:00-03:00').toISOString(),
    ])
  })

  it('exclui slot que colide com agendamento existente', () => {
    const busy: BusyInterval[] = [
      { start: d('2026-08-10T10:00:00-03:00'), end: d('2026-08-10T10:30:00-03:00') },
    ]
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy,
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-01T00:00:00-03:00'),
    })
    expect(slots.map((s) => s.toISOString())).not.toContain(d('2026-08-10T10:00:00-03:00').toISOString())
    expect(slots).toHaveLength(5)
  })

  it('buffer exclui slots vizinhos a um agendamento existente', () => {
    const busy: BusyInterval[] = [
      { start: d('2026-08-10T10:00:00-03:00'), end: d('2026-08-10T10:30:00-03:00') },
    ]
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy,
      slotDurationMinutes: 30,
      bufferMinutes: 15,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-01T00:00:00-03:00'),
    })
    // 09:30 (termina 10:00, +buffer entra no ocupado) e 10:30 (começa colado no buffer de saída) somem também
    expect(slots.map((s) => s.toISOString())).toEqual([
      d('2026-08-10T09:00:00-03:00').toISOString(),
      d('2026-08-10T11:00:00-03:00').toISOString(),
      d('2026-08-10T11:30:00-03:00').toISOString(),
    ])
  })

  it('exclui slots no passado', () => {
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy: [],
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-10T10:15:00-03:00'),
    })
    expect(slots.map((s) => s.toISOString())).toEqual([
      d('2026-08-10T10:30:00-03:00').toISOString(),
      d('2026-08-10T11:00:00-03:00').toISOString(),
      d('2026-08-10T11:30:00-03:00').toISOString(),
    ])
  })

  it('só gera slots nos dias da semana configurados', () => {
    const slots = computeFreeSlots({
      workingHours: MONDAY, // só segunda (weekday 1)
      busy: [],
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'), // segunda
      rangeTo: d('2026-08-11T23:59:59-03:00'), // terça
      now: d('2026-08-01T00:00:00-03:00'),
    })
    expect(slots.every((s) => s.getDay() === 1)).toBe(true)
  })
})
