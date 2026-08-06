// Constantes do grid estilo Google Calendar — espelham o protótipo aprovado
// (agenda-prototype.jsx).
export const DAY_START = 8 // 08:00
export const DAY_END = 19 // 19:00
export const SLOT_MIN = 30 // grade de 30 em 30 min
export const ROW_H = 56 // px por slot de 30min

export const GRID_HEIGHT = ((DAY_END - DAY_START) * 60 * ROW_H) / SLOT_MIN
export const GRID_ROWS = ((DAY_END - DAY_START) * 60) / SLOT_MIN

export function minutesSinceMidnightBR(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function blockStyle(startIso: string, durationMin: number, tz: string) {
  const startMin = minutesSinceMidnightBR(startIso, tz)
  const top = ((startMin - DAY_START * 60) / SLOT_MIN) * ROW_H
  const height = (durationMin / SLOT_MIN) * ROW_H - 4
  return { top: `${top}px`, height: `${Math.max(height, 28)}px` }
}
