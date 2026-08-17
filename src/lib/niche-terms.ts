// Vocabulário que muda conforme a família de nicho — "clínica"/"paciente"/
// "consulta"/"convênio" não fazem sentido pra salão de beleza ou escritório
// de advocacia. Segue o mesmo padrão de agrupamento de
// src/lib/niche-features.ts (módulos inteiros escondidos por nicho) e dos
// overrides de roteiro em src/lib/message-templates.ts (BELEZA_OVERRIDES
// etc) — não duplica lista de nicho em cada lugar novo.
export type NicheGroup = 'saude' | 'beleza' | 'juridico'

const BELEZA_SLUGS = new Set(['estetica', 'unhas', 'barbearia', 'cabeleireiro', 'sobrancelha'])
const JURIDICO_SLUGS = new Set(['advogado'])

export function nicheGroupOf(nicheSlug: string | null | undefined): NicheGroup {
  if (nicheSlug && BELEZA_SLUGS.has(nicheSlug)) return 'beleza'
  if (nicheSlug && JURIDICO_SLUGS.has(nicheSlug)) return 'juridico'
  return 'saude'
}

export type NicheTerms = {
  // Substantivo do negócio, minúsculo — "sua {{businessWord}} já tem site?"
  businessWord: string
  // "na" | "no" — concordância de gênero pra usar com businessWord
  businessWordIn: string
  businessDataLabel: string
  siteLabel: string
  // "Paciente" | "Cliente" — rótulo de campo/coluna (maiúsculo)
  personLabel: string
  // "paciente" | "cliente" — uso dentro de frase (minúsculo)
  personLabelLower: string
  // "consulta" | "horário" | "reunião" — o que se marca
  bookingWord: string
  // "sua" | "seu" — concordância de gênero pra usar com bookingWord
  bookingWordArticle: string
  observacoesPlaceholder: string
  // Campo "Convênio" só faz sentido pra saúde (plano de saúde) — nichos de
  // beleza/jurídico não têm esse conceito, campo inteiro fica escondido.
  hasConvenio: boolean
}

const TERMS: Record<NicheGroup, NicheTerms> = {
  saude: {
    businessWord: 'clínica',
    businessWordIn: 'na',
    businessDataLabel: 'Dados da clínica',
    siteLabel: 'Site da clínica',
    personLabel: 'Paciente',
    personLabelLower: 'paciente',
    bookingWord: 'consulta',
    bookingWordArticle: 'sua',
    observacoesPlaceholder: 'Ex: aceitamos convênio X e Y, temos estacionamento gratuito, atendemos em libras...',
    hasConvenio: true,
  },
  beleza: {
    businessWord: 'salão',
    businessWordIn: 'no',
    businessDataLabel: 'Dados do salão',
    siteLabel: 'Site do salão',
    personLabel: 'Cliente',
    personLabelLower: 'cliente',
    bookingWord: 'horário',
    bookingWordArticle: 'seu',
    observacoesPlaceholder: 'Ex: temos estacionamento gratuito, aceitamos Pix, trabalhamos com esmaltação em gel...',
    hasConvenio: false,
  },
  juridico: {
    businessWord: 'escritório',
    businessWordIn: 'no',
    businessDataLabel: 'Dados do escritório',
    siteLabel: 'Site do escritório',
    personLabel: 'Cliente',
    personLabelLower: 'cliente',
    bookingWord: 'reunião',
    bookingWordArticle: 'sua',
    observacoesPlaceholder: 'Ex: atendemos por videochamada, primeira consulta é gratuita...',
    hasConvenio: false,
  },
}

export function nicheTermsFor(nicheSlug: string | null | undefined): NicheTerms {
  return TERMS[nicheGroupOf(nicheSlug)]
}
