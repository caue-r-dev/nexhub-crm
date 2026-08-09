// Cálculo puro de horários livres — sem I/O, sem Supabase. Consumido pela
// rota pública de disponibilidade e pela página /agendar/[slug], ambas
// responsáveis por buscar working hours + agendamentos existentes no banco
// e passar pra cá já no formato abaixo.
export type WorkingHour = { weekday: number; startTime: string; endTime: string }
export type BusyInterval = { start: Date; end: Date }

export type ComputeFreeSlotsInput = {
  workingHours: WorkingHour[]
  busy: BusyInterval[]
  slotDurationMinutes: number
  bufferMinutes: number
  rangeFrom: Date
  rangeTo: Date
  now: Date
}

function parseTimeOnDay(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(day)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function computeFreeSlots({
  workingHours,
  busy,
  slotDurationMinutes,
  bufferMinutes,
  rangeFrom,
  rangeTo,
  now,
}: ComputeFreeSlotsInput): Date[] {
  const slots: Date[] = []
  const slotMs = slotDurationMinutes * 60_000
  const bufferMs = bufferMinutes * 60_000

  const expandedBusy = busy.map((b) => ({
    start: new Date(b.start.getTime() - bufferMs),
    end: new Date(b.end.getTime() + bufferMs),
  }))

  let day = startOfDay(rangeFrom)
  const lastDay = startOfDay(rangeTo)

  while (day <= lastDay) {
    const weekday = day.getDay()
    const dayHours = workingHours.filter((h) => h.weekday === weekday)

    for (const hours of dayHours) {
      const windowStart = parseTimeOnDay(day, hours.startTime)
      const windowEnd = parseTimeOnDay(day, hours.endTime)

      for (
        let slotStart = new Date(windowStart);
        slotStart.getTime() + slotMs <= windowEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotMs)
      ) {
        const slotEnd = new Date(slotStart.getTime() + slotMs)

        if (slotStart < now) continue
        if (expandedBusy.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))) continue

        slots.push(new Date(slotStart))
      }
    }

    day = new Date(day.getTime() + 24 * 3600_000)
  }

  return slots
}
