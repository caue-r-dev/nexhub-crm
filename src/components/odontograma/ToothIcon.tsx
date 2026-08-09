import type { ToothKind } from '@/lib/odontogram'

// Formas baseadas na morfologia dental real (referência: anatomia padrão de
// gráfico odontológico — incisivo em forma de lâmina/cinzel com raiz única,
// canino com cúspide única pontiaguda e raiz longa (a maior raiz da boca),
// pré-molar com 2 cúspides (vestibular+lingual) e raiz uni ou bifurcada,
// molar com coroa larga de 4-5 cúspides). Cada `d` combina 1-3 subpaths
// (coroa + raiz(es)) num único <path>, preenchidos juntos pela cor de status.
// `upper`: true = arcada superior (coroa em cima, raiz descendo pro centro),
// false = arcada inferior (coroa embaixo, raiz subindo pro centro).
//
// Molares superiores têm 3 raízes (2 vestibulares + 1 palatina) e molares
// inferiores têm 2 raízes (mesial + distal) — diferença anatômica real,
// por isso o molar é o único tipo com path próprio por arcada.
const PATHS: Record<Exclude<ToothKind, 'molar'>, string> = {
  // Coroa em lâmina/cinzel de borda reta, raiz única longa e afunilada.
  incisor: `
    M7 3 Q7 1 12 1 Q17 1 17 3 L17 9 Q17 14 12 14 Q7 14 7 9 Z
    M8.5 14 L8 22 Q7.8 30 10.5 34.5 Q11.3 36 12 36 Q12.7 36 13.5 34.5 Q16.2 30 16 22 L15.5 14 Z
  `,
  // Cúspide única, alta e pontiaguda; a maior raiz da boca.
  canine: `
    M6.5 7 L11.3 1 Q12 0.3 12.7 1 L17.5 7 Q18 9 18 10.5 L18 11 Q18 15 12 15 Q6 15 6 11 L6 10.5 Q6 9 6.5 7 Z
    M8 15 L7.3 24 Q7 32 10.3 36.8 Q11.2 38.2 12 38.2 Q12.8 38.2 13.7 36.8 Q17 32 16.7 24 L16 15 Z
  `,
  // Coroa com 2 cúspides (vestibular + lingual), raiz única com bifurcação leve no ápice.
  premolar: `
    M5.5 7 Q5.5 4 7.5 3.3 Q9.2 2.7 10 4.3 Q11 2.5 12 2.5 Q13 2.5 14 4.3 Q14.8 2.7 16.5 3.3 Q18.5 4 18.5 7 L18.5 10.5 Q18.5 15 12 15 Q5.5 15 5.5 10.5 Z
    M7.5 15 Q7 21 8.5 27 Q9.2 30 10.3 29.3 Q10.8 24 11 15 Z
    M16.5 15 Q17 21 15.5 27 Q14.8 30 13.7 29.3 Q13.2 24 13 15 Z
  `,
}

// Coroa larga de 4-5 cúspides, mais espaçosa que os outros tipos.
const MOLAR_CROWN = `M3.5 8 Q3.5 4.5 6.5 3.5 Q8.5 2.5 10 4.5 Q11 2.8 12 2.8 Q13 2.8 14 4.5 Q15.5 2.5 17.5 3.5 Q20.5 4.5 20.5 8 L20.5 11 Q20.5 15.5 12 15.5 Q3.5 15.5 3.5 11 Z`

const MOLAR_PATHS: Record<'upper' | 'lower', string> = {
  // 3 raízes: mesiobucal + distobucal (curtas, divergentes) + palatina (longa, central)
  upper: `
    ${MOLAR_CROWN}
    M6 15.5 Q5.3 20 6.8 24.5 Q7.5 26.8 8.3 26.2 Q8.9 21.8 9.5 15.5 Z
    M18 15.5 Q18.7 20 17.2 24.5 Q16.5 26.8 15.7 26.2 Q15.1 21.8 14.5 15.5 Z
    M10 15.5 Q9.5 23 10.8 31 Q11.4 34 12 34 Q12.6 34 13.2 31 Q14.5 23 14 15.5 Z
  `,
  // 2 raízes: mesial + distal, ambas longas
  lower: `
    ${MOLAR_CROWN}
    M6 15.5 Q5 24 6.8 31 Q7.6 34.3 9 33.5 Q9.8 27 10 15.5 Z
    M18 15.5 Q19 24 17.2 31 Q16.4 34.3 15 33.5 Q14.2 27 14 15.5 Z
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
  const d = kind === 'molar' ? MOLAR_PATHS[upper ? 'upper' : 'lower'] : PATHS[kind]

  return (
    <svg
      viewBox="0 0 24 40"
      className="h-14 w-8"
      style={{ transform: upper ? undefined : 'scaleY(-1)' }}
    >
      <path
        d={d}
        fill={color}
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinejoin="round"
        className="text-text-secondary"
      />
    </svg>
  )
}
