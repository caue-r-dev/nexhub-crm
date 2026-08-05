import type { ToothKind } from '@/lib/odontogram'

// Formas desenhadas do zero (não anatomicamente exatas, apenas visualmente
// próximas do padrão de gráfico odontológico) — cada `d` combina 1-2 subpaths
// (coroa + raiz(es)) num único <path>, preenchidos juntos pela cor de status.
// `upper`: true = arcada superior (coroa em cima, raiz descendo pro centro),
// false = arcada inferior (coroa embaixo, raiz subindo pro centro).
const PATHS: Record<ToothKind, string> = {
  incisor: `
    M8 4 Q8 1.5 12 1.5 Q16 1.5 16 4 L16 9 Q16 13 12 13 Q8 13 8 9 Z
    M9.5 12.5 Q9 20 10.5 26.5 Q11.2 29 12 29 Q12.8 29 13.5 26.5 Q15 20 14.5 12.5 Z
  `,
  canine: `
    M7 6 Q7 4 9 3 L12 1 L15 3 Q17 4 17 6 L17 9.5 Q17 13.5 12 13.5 Q7 13.5 7 9.5 Z
    M9 13 Q8.3 21 10 28.5 Q11 31.5 12 31.5 Q13 31.5 14 28.5 Q15.7 21 15 13 Z
  `,
  premolar: `
    M6 6 Q6 3.5 8.5 3 Q10 2.5 11 4 Q12 2.5 13 4 Q14 2.5 15.5 3 Q18 3.5 18 6 L18 9.5 Q18 13.5 12 13.5 Q6 13.5 6 9.5 Z
    M8 13 Q7.5 19 8.7 24 Q9.3 26.5 10.3 26 Q10.8 22 11 13 Z
    M16 13 Q16.5 19 15.3 24 Q14.7 26.5 13.7 26 Q13.2 22 13 13 Z
  `,
  molar: `
    M4 7 Q4 4 6.5 3.3 Q8 2.5 9 4 Q10.5 2.3 12 4 Q13.5 2.3 15 4 Q16 2.5 17.5 3.3 Q20 4 20 7 L20 9.5 Q20 13.5 12 13.5 Q4 13.5 4 9.5 Z
    M6.5 13 Q5.5 20 7 26 Q7.8 29 9 28.3 Q9.7 23 10 13 Z
    M17.5 13 Q18.5 20 17 26 Q16.2 29 15 28.3 Q14.3 23 14 13 Z
  `,
}

export function ToothIcon({
  kind,
  upper,
  color,
}: {
  kind: ToothKind
  upper: boolean
  color: string
}) {
  return (
    <svg
      viewBox="0 0 24 32"
      className="h-11 w-6"
      style={{ transform: upper ? undefined : 'scaleY(-1)' }}
    >
      <path
        d={PATHS[kind]}
        fill={color}
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        className="text-text-secondary"
      />
    </svg>
  )
}
