// Paleta simples pré-definida — não é color picker livre (A3 do kickoff).
export const PROFESSIONAL_COLORS = [
  '#0F6E56',
  '#B45309',
  '#4F46E5',
  '#DC2626',
  '#0891B2',
  '#7C3AED',
  '#C026D3',
  '#65A30D',
]

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}
