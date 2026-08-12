// Zonas nomeadas sobre a mesma silhueta já usada (body-front.svg /
// body-back.svg) — não é um SVG novo, são retângulos invisíveis (% da
// imagem) usados só pra reconhecer em que parte do corpo o clique caiu.
// Direita/esquerda é sempre do ponto de vista do paciente (visão frontal:
// direita do paciente fica à esquerda de quem olha a tela).
export type BodyRegion = {
  id: string
  label: string
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

const SHARED_LIMBS: Omit<BodyRegion, 'label'>[] = [
  { id: 'cabeca', xMin: 35, xMax: 58, yMin: 0, yMax: 9 },
  { id: 'pescoco', xMin: 42, xMax: 55, yMin: 9, yMax: 13 },
  { id: 'ombro_direito', xMin: 20, xMax: 42, yMin: 13, yMax: 20 },
  { id: 'ombro_esquerdo', xMin: 55, xMax: 78, yMin: 13, yMax: 20 },
  { id: 'torso_superior', xMin: 35, xMax: 63, yMin: 18, yMax: 30 },
  { id: 'braco_direito', xMin: 3, xMax: 32, yMin: 20, yMax: 45 },
  { id: 'braco_esquerdo', xMin: 66, xMax: 95, yMin: 20, yMax: 45 },
  { id: 'mao_direita', xMin: 0, xMax: 15, yMin: 45, yMax: 58 },
  { id: 'mao_esquerda', xMin: 83, xMax: 100, yMin: 45, yMax: 58 },
  { id: 'torso_inferior', xMin: 35, xMax: 63, yMin: 30, yMax: 45 },
  { id: 'quadril', xMin: 33, xMax: 67, yMin: 45, yMax: 55 },
  { id: 'coxa_direita', xMin: 36, xMax: 49, yMin: 55, yMax: 71 },
  { id: 'coxa_esquerda', xMin: 51, xMax: 64, yMin: 55, yMax: 71 },
  { id: 'joelho_direito', xMin: 37, xMax: 49, yMin: 71, yMax: 77 },
  { id: 'joelho_esquerdo', xMin: 51, xMax: 63, yMin: 71, yMax: 77 },
  { id: 'perna_direita', xMin: 35, xMax: 49, yMin: 77, yMax: 92 },
  { id: 'perna_esquerda', xMin: 51, xMax: 65, yMin: 77, yMax: 92 },
  { id: 'pe_direito', xMin: 28, xMax: 47, yMin: 92, yMax: 100 },
  { id: 'pe_esquerdo', xMin: 53, xMax: 72, yMin: 92, yMax: 100 },
]

const FRONT_LABELS: Record<string, string> = {
  cabeca: 'Cabeça',
  pescoco: 'Pescoço',
  ombro_direito: 'Ombro direito',
  ombro_esquerdo: 'Ombro esquerdo',
  torso_superior: 'Peito',
  braco_direito: 'Braço direito',
  braco_esquerdo: 'Braço esquerdo',
  mao_direita: 'Mão direita',
  mao_esquerda: 'Mão esquerda',
  torso_inferior: 'Abdômen',
  quadril: 'Quadril',
  coxa_direita: 'Coxa direita',
  coxa_esquerda: 'Coxa esquerda',
  joelho_direito: 'Joelho direito',
  joelho_esquerdo: 'Joelho esquerdo',
  perna_direita: 'Perna direita (canela)',
  perna_esquerda: 'Perna esquerda (canela)',
  pe_direito: 'Pé direito',
  pe_esquerdo: 'Pé esquerdo',
}

const BACK_LABELS: Record<string, string> = {
  cabeca: 'Cabeça',
  pescoco: 'Nuca',
  ombro_direito: 'Ombro direito',
  ombro_esquerdo: 'Ombro esquerdo',
  torso_superior: 'Costas superior',
  braco_direito: 'Braço direito',
  braco_esquerdo: 'Braço esquerdo',
  mao_direita: 'Mão direita',
  mao_esquerda: 'Mão esquerda',
  torso_inferior: 'Lombar',
  quadril: 'Quadril / glúteo',
  coxa_direita: 'Posterior da coxa direita',
  coxa_esquerda: 'Posterior da coxa esquerda',
  joelho_direito: 'Posterior do joelho direito',
  joelho_esquerdo: 'Posterior do joelho esquerdo',
  perna_direita: 'Panturrilha direita',
  perna_esquerda: 'Panturrilha esquerda',
  pe_direito: 'Calcanhar direito',
  pe_esquerdo: 'Calcanhar esquerdo',
}

export const FRONT_REGIONS: BodyRegion[] = SHARED_LIMBS.map((r) => ({ ...r, label: FRONT_LABELS[r.id] }))
export const BACK_REGIONS: BodyRegion[] = SHARED_LIMBS.map((r) => ({ ...r, label: BACK_LABELS[r.id] }))

export function findBodyRegion(view: 'front' | 'back', x: number, y: number): BodyRegion | null {
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS
  return regions.find((r) => x >= r.xMin && x <= r.xMax && y >= r.yMin && y <= r.yMax) ?? null
}
