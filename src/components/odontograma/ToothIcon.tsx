import type { ToothKind } from '@/lib/odontogram'

// Cada dente é UM contorno único e fechado (coroa + raiz como uma silhueta
// só, sem peças soltas) — segue a referência de gráfico odontológico padrão
// (ex: EAP-Goiás): incisivo em lâmina com raiz única, canino com cúspide
// única e a maior raiz da boca, pré-molar com coroa bicúspide e raiz única
// afunilada, molar com coroa larga e raiz bifurcada em 2 pernas.
// `upper`: true = arcada superior (coroa em cima), false = arcada inferior
// (ícone espelhado verticalmente, coroa fica embaixo).
const PATHS: Record<ToothKind, string> = {
  incisor: `
    M8 3 Q8 1.2 12 1.2 Q16 1.2 16 3 L16 9 Q16 12.5 14 13.5
    Q14.6 22 13.2 30 Q12.6 35.5 12 37 Q11.4 35.5 10.8 30
    Q9.4 22 10 13.5 Q8 12.5 8 9 Z
  `,
  canine: `
    M6.5 8 Q6.5 6 8 5 L11.3 1.3 Q12 0.5 12.7 1.3 L16 5 Q17.5 6 17.5 8
    L17.5 11 Q17.5 14.5 15 15.5 Q15.7 24 13.8 33 Q12.9 38 12 39
    Q11.1 38 10.2 33 Q8.3 24 9 15.5 Q6.5 14.5 6.5 11 Z
  `,
  premolar: `
    M6 7 Q6 4.5 7.5 4 Q9 3.3 10 4.8 Q11 3.2 12 3.2 Q13 3.2 14 4.8
    Q15 3.3 16.5 4 Q18 4.5 18 7 L18 10.5 Q18 14 15.3 15
    Q16 23 14.5 30 Q13.8 34.5 12 35.5 Q10.2 34.5 9.5 30
    Q8 23 8.7 15 Q6 14 6 10.5 Z
  `,
  molar: `
    M4 8 Q4 5 6 4.2 Q8 3.3 9.5 5 Q11 3.4 12 3.4 Q13 3.4 14.5 5
    Q16 3.3 18 4.2 Q20 5 20 8 L20 11 Q20 14.5 17 15.5
    Q17.7 21 16.8 27 Q16.3 30.5 15 31.5 Q14.3 27 14.5 21 Q14.6 17.5 15 15.8
    Q13 16.3 12 16.3 Q11 16.3 9 15.8 Q9.4 17.5 9.5 21 Q9.7 27 9 31.5
    Q7.7 30.5 7.2 27 Q6.3 21 7 15.5 Q4 14.5 4 11 Z
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
        strokeWidth="0.9"
        strokeLinejoin="round"
        className="text-text-secondary"
      />
    </svg>
  )
}
