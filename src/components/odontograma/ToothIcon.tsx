import type { ToothKind } from '@/lib/odontogram'

// Traço fino, silhueta única por dente (coroa+raiz), seguindo referência de
// gráfico odontológico padrão (linha delicada, sem preenchimento grosso).
// `upper`: true = arcada superior (coroa em cima), false = arcada inferior
// (ícone espelhado verticalmente, coroa fica embaixo).
const PATHS: Record<ToothKind, string> = {
  incisor: `
    M9 1.5 Q8 1.5 8 3 L8 8.5 Q8 12.5 12 13 Q16 12.5 16 8.5 L16 3 Q16 1.5 15 1.5 Z
    M9.3 13 Q8.6 21 10 29 Q10.8 34.5 12 35.5 Q13.2 34.5 14 29 Q15.4 21 14.7 13 Z
  `,
  canine: `
    M8 6 Q8 4 9.5 3 L11.4 1.2 Q12 0.6 12.6 1.2 L14.5 3 Q16 4 16 6 L16 8.5 Q16 12.5 12 13 Q8 12.5 8 8.5 Z
    M9 13 Q8 22 9.8 31.5 Q10.7 37 12 38 Q13.3 37 14.2 31.5 Q16 22 15 13 Z
  `,
  premolar: `
    M7 5.5 Q7 3.5 8.5 3 Q10 2.5 10.7 4 Q11.3 2.8 12 2.8 Q12.7 2.8 13.3 4 Q14 2.5 15.5 3 Q17 3.5 17 5.5
    L17 8.5 Q17 12.5 12 13 Q7 12.5 7 8.5 Z
    M9 13 Q8.3 20 9.5 26 Q10.2 29.5 10.8 27.5 Q11.3 21 11.4 13 Z
    M15 13 Q15.7 20 14.5 26 Q13.8 29.5 13.2 27.5 Q12.7 21 12.6 13 Z
  `,
  molar: `
    M5 6.5 Q5 4 7 3.3 Q9 2.5 10 4 Q11 2.7 12 2.7 Q13 2.7 14 4 Q15 2.5 17 3.3 Q19 4 19 6.5
    L19 9 Q19 13 12 13.5 Q5 13 5 9 Z
    M6.7 13.3 Q5.7 19.5 7.3 25 Q8.1 28 9 27.3 Q9.7 22 9.8 13.5 Z
    M17.3 13.3 Q18.3 19.5 16.7 25 Q15.9 28 15 27.3 Q14.3 22 14.2 13.5 Z
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
      viewBox="0 0 24 40"
      className="h-14 w-8"
      style={{ transform: upper ? undefined : 'scaleY(-1)' }}
    >
      <path
        d={PATHS[kind]}
        fill={color}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-text-secondary"
      />
    </svg>
  )
}
