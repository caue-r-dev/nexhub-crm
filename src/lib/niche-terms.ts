// Vocabulário que muda conforme a família de nicho — "clínica"/"paciente"
// não fazem sentido pra salão de beleza ou escritório de advocacia. Segue o
// mesmo padrão de agrupamento de src/lib/niche-features.ts e dos overrides
// de roteiro em src/lib/message-templates.ts (BELEZA_OVERRIDES etc) — não
// duplica lista de nicho em cada lugar novo.
export type NicheGroup = 'saude' | 'beleza' | 'juridico'

const BELEZA_SLUGS = new Set(['estetica', 'unhas', 'barbearia', 'cabeleireiro', 'sobrancelha'])
const JURIDICO_SLUGS = new Set(['advogado'])

export function nicheGroupOf(nicheSlug: string | null | undefined): NicheGroup {
  if (nicheSlug && BELEZA_SLUGS.has(nicheSlug)) return 'beleza'
  if (nicheSlug && JURIDICO_SLUGS.has(nicheSlug)) return 'juridico'
  return 'saude'
}

export type NicheTerms = {
  businessDataLabel: string
  observacoesPlaceholder: string
}

const TERMS: Record<NicheGroup, NicheTerms> = {
  saude: {
    businessDataLabel: 'Dados da clínica',
    observacoesPlaceholder: 'Ex: aceitamos convênio X e Y, temos estacionamento gratuito, atendemos em libras...',
  },
  beleza: {
    businessDataLabel: 'Dados do salão',
    observacoesPlaceholder: 'Ex: temos estacionamento gratuito, aceitamos Pix, trabalhamos com esmaltação em gel...',
  },
  juridico: {
    businessDataLabel: 'Dados do escritório',
    observacoesPlaceholder: 'Ex: atendemos por videochamada, primeira consulta é gratuita...',
  },
}

export function nicheTermsFor(nicheSlug: string | null | undefined): NicheTerms {
  return TERMS[nicheGroupOf(nicheSlug)]
}
