// Nichos que compartilham um mesmo módulo funcional — usado pra decidir o
// que aparece na ficha do cliente e no menu, sem cada tela reinventar a
// própria lista. Odontograma/Tratamentos/Próteses ficam de fora daqui de
// propósito: são específicos de dentista o bastante pra não virar constante
// compartilhada.
export const ANAMNESE_EVOLUCOES_NICHES = new Set([
  'dentista',
  'medicina',
  'fisioterapia',
  'psicologia',
  'nutricionista',
  'personal_trainer',
])

export const ATESTADO_RECEITA_NICHES = new Set([
  'dentista',
  'medicina',
  'fisioterapia',
  'psicologia',
  'nutricionista',
])

export const ESTOQUE_NICHES = new Set(['dentista', 'estetica', 'unhas', 'barbearia', 'veterinario'])
