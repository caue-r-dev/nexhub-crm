export type AnamneseQuestion = {
  id: string
  label: string
  hasInfo: boolean
}

// Roteiro de saúde — dentista, medicina, fisioterapia, psicologia.
const HEALTH_QUESTIONS: AnamneseQuestion[] = [
  { id: 'pressao_alta', label: 'Tem pressão alta?', hasInfo: true },
  { id: 'alergia', label: 'Possui alguma alergia? (Como penicilinas, AAS ou outra)', hasInfo: true },
  { id: 'alteracao_sanguinea', label: 'Possui alguma alteração sanguínea?', hasInfo: true },
  { id: 'hemorragia', label: 'Já teve hemorragia diagnosticada?', hasInfo: false },
  { id: 'cardiovascular', label: 'Possui alguma alteração cardiovascular?', hasInfo: true },
  { id: 'diabetes', label: 'Possui diabetes?', hasInfo: true },
  { id: 'asma', label: 'Possui asma?', hasInfo: false },
  { id: 'anemia', label: 'Possui anemia?', hasInfo: false },
  { id: 'disfuncao_hepatica', label: 'Possui alguma disfunção hepática?', hasInfo: true },
  { id: 'disfuncao_renal', label: 'Apresenta alguma disfunção renal?', hasInfo: true },
  { id: 'disfuncao_respiratoria', label: 'Possui alguma disfunção respiratória?', hasInfo: true },
  { id: 'alteracao_ossea', label: 'Possui alguma alteração óssea?', hasInfo: true },
  { id: 'doenca_transmissivel', label: 'Possui alguma doença transmissível?', hasInfo: true },
  { id: 'outra_doenca', label: 'Possui alguma outra doença/síndrome não mencionada?', hasInfo: true },
  { id: 'reacao_anestesia', label: 'Já sofreu alguma reação alérgica ao receber anestesia?', hasInfo: true },
  { id: 'azia_gastrite', label: 'Possui azia, má digestão, refluxo, úlcera ou gastrite?', hasInfo: false },
  { id: 'dificuldade_abrir_boca', label: 'Tem dificuldade de abrir a boca?', hasInfo: false },
  { id: 'febre_reumatica', label: 'Possui algum antecedente de febre reumática?', hasInfo: false },
  { id: 'estalado_boca', label: 'Escuta algum estalido ao abrir a boca?', hasInfo: false },
  { id: 'gravida', label: 'Está grávida?', hasInfo: true },
  { id: 'amamentando', label: 'Está amamentando?', hasInfo: false },
  { id: 'anticoncepcional', label: 'Toma anticoncepcional?', hasInfo: true },
]

// Intake de caso — advocacia. Mesma estrutura (sim/não + observação), perguntas
// trocadas pro contexto jurídico (ver task_plan_advocacia.md).
const LEGAL_QUESTIONS: AnamneseQuestion[] = [
  { id: 'processo_em_andamento', label: 'Já existe processo em andamento sobre esse caso?', hasInfo: true },
  { id: 'urgencia', label: 'O caso tem urgência (prazo próximo, risco iminente)?', hasInfo: true },
  { id: 'possui_documentos', label: 'Possui documentos relacionados ao caso (contratos, notificações, etc)?', hasInfo: true },
  { id: 'partes_envolvidas', label: 'Há outras partes envolvidas além de você?', hasInfo: true },
  { id: 'acordo_extrajudicial', label: 'Já tentou acordo extrajudicial?', hasInfo: true },
  { id: 'representado_advogado', label: 'Já foi representado por outro advogado nesse caso?', hasInfo: true },
  { id: 'prazo_conhecido', label: 'Existe algum prazo processual já conhecido?', hasInfo: true },
]

const QUESTIONS_BY_NICHE: Record<string, AnamneseQuestion[]> = {
  dentista: HEALTH_QUESTIONS,
  medicina: HEALTH_QUESTIONS,
  fisioterapia: HEALTH_QUESTIONS,
  psicologia: HEALTH_QUESTIONS,
  advogado: LEGAL_QUESTIONS,
}

export function getAnamneseQuestions(nicheSlug: string | null): AnamneseQuestion[] {
  if (!nicheSlug) return HEALTH_QUESTIONS
  return QUESTIONS_BY_NICHE[nicheSlug] ?? HEALTH_QUESTIONS
}

export type AnamneseAnswer = { value: 'sim' | 'nao' | 'nao_sei' | ''; info?: string }
export type AnamneseQuestionnaire = {
  queixa_principal: string
  answers: Record<string, AnamneseAnswer>
}
