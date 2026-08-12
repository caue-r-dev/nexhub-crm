// Nichos que compartilham um mesmo módulo funcional — usado pra decidir o
// que aparece na ficha do cliente e no menu, sem cada tela reinventar a
// própria lista. Odontograma/Tratamentos/Próteses ficam de fora daqui de
// propósito: são específicos de dentista o bastante pra não virar constante
// compartilhada. Nutrição, Personal trainer e Barbearia foram descontinuados
// (ver consolidação de nichos 2026-08-12) — removidos daqui mesmo que ainda
// existam tenants antigos com esse niche_id, pra não reintroduzir o módulo.
export const ANAMNESE_EVOLUCOES_NICHES = new Set(['dentista', 'medicina', 'fisioterapia', 'psicologia'])

export const ATESTADO_RECEITA_NICHES = new Set(['dentista', 'medicina', 'fisioterapia', 'psicologia', 'veterinario'])

export const ESTOQUE_NICHES = new Set(['dentista', 'estetica', 'unhas', 'veterinario', 'cabeleireiro', 'sobrancelha'])

export const PAIN_MAP_NICHES = new Set(['fisioterapia'])

export const BEFORE_AFTER_NICHES = new Set(['estetica'])
