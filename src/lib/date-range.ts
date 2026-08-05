// MVP mono-região (Brasil) — Brasília não tem mais horário de verão desde 2019,
// então UTC-3 fixo é seguro pra construir limites de dia/semana. Formatação de
// horário pro usuário sempre deve passar timeZone: BR_TZ explicitamente, já que
// o server (Vercel) roda em UTC e não podemos confiar no fuso local do processo.
export const BR_TZ = 'America/Sao_Paulo'

function ymdInBR(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000)
}

// Meia-noite em Brasília do dia (no calendário de Brasília) em que `date` cai.
export function startOfDay(date: Date): Date {
  return new Date(`${ymdInBR(date)}T03:00:00.000Z`)
}

// Segunda-feira da semana (calendário de Brasília) em que `date` cai.
export function startOfWeek(date: Date): Date {
  const start = startOfDay(date)
  const weekday = new Date(`${ymdInBR(date)}T00:00:00Z`).getUTCDay() // 0 = domingo
  const diff = weekday === 0 ? -6 : 1 - weekday
  return addDays(start, diff)
}

export function toDateInputValue(date: Date): string {
  return ymdInBR(date)
}

// Dia do mês e abreviação do dia da semana, ambos no calendário de Brasília —
// não usar date.getDate()/getDay() diretamente (dependem do fuso do processo).
export function dayOfMonthBR(date: Date): number {
  return Number(ymdInBR(date).slice(-2))
}

export function weekdayIndexBR(date: Date): number {
  // 0 = segunda .. 6 = domingo
  const sundayBased = new Date(`${ymdInBR(date)}T00:00:00Z`).getUTCDay()
  return (sundayBased + 6) % 7
}
