// Resolução central de template + variável — usada tanto pelo bot de
// primeiro contato (webhook Chatwoot) quanto por disparo manual/automações
// (confirmação de agendamento, follow-up de falta/atraso). Uma função só
// evita template divergir de contexto pra contexto.
import { createAdminClient } from '@/lib/supabase/admin'
import { HANDOFF_FALLBACK_MESSAGE } from '@/lib/conversational-bot'
import { nicheGroupOf, type NicheGroup } from '@/lib/niche-terms'

export type TemplateContext = {
  nome_clinica?: string
  endereco?: string
  horario_atendimento?: string
  nome_profissional?: string
  valor_consulta?: string
  nome_paciente?: string
  data_consulta?: string
  horario_consulta?: string
  procedimento?: string
  link_agendamento?: string
  nome_cliente?: string
  ultima_visita?: string
  valor_orcamento?: string
  valor_sinal?: string
}

export type StoredTemplate = { content: string; active: boolean; label: string | null; hidden: boolean }

// Variável ausente do contexto vira string vazia, nunca o placeholder cru
// — "{{endereco}}" aparecendo pro paciente de verdade é pior que uma frase
// com um buraco (aconteceu: confirmação de agendamento não passava
// endereco no contexto, template mostrou o placeholder literal).
function applyVars(content: string, vars: TemplateContext): string {
  return content.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => vars[key as keyof TemplateContext] ?? '')
}

// Busca o template ativo do tenant; se não existir linha (tenant antigo,
// migração não rodou seed, ou key nova) cai pro fallback passado por quem
// chamou — nunca quebra o fluxo de mensagem por falta de template.
export async function resolveTemplate(
  tenantId: string,
  templateKey: string,
  context: TemplateContext,
  fallback: string
): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('message_templates')
    .select('content')
    .eq('tenant_id', tenantId)
    .eq('template_key', templateKey)
    .eq('active', true)
    .eq('hidden', false)
    .maybeSingle()

  const content = data?.content?.trim() || fallback
  return applyVars(content, context)
}

// Busca a linha crua do banco (sem aplicar fallback) — usada por quem
// precisa decidir sozinho o que fazer quando o card está oculto (ex:
// pular a etapa do roteiro inteira em vez de cair no texto padrão).
export async function getStoredTemplate(tenantId: string, templateKey: string): Promise<StoredTemplate | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('message_templates')
    .select('content, active, label, hidden')
    .eq('tenant_id', tenantId)
    .eq('template_key', templateKey)
    .maybeSingle()

  return data
}

type TemplateKey = (typeof TEMPLATE_KEYS)[number]['key']

// Roteiro padrão pra todo tenant novo, criado a partir do script
// universalizado que o dono validou pra clientes reais (ver
// 026_atualiza_script_mensagens.sql) — dono personaliza depois em
// /configuracoes/mensagens. Sem isso, tenant nasce sem nenhuma linha em
// message_templates e cai nos fallbacks genéricos hardcoded espalhados
// pelo código, que nunca foram pensados como texto final pro cliente.
//
// BASE usa tom de saúde/clínica ("paciente", "atendimento inicial") — é o
// texto original validado. Nichos de outra família (beleza, advocacia,
// personal trainer) sobrescrevem só as etapas que mudam de tom
// (NICHE_OVERRIDES), o resto (confirmação, follow-up, campanha, ausência)
// já é neutro o bastante pra qualquer nicho e não precisa duplicar.
const BASE_TEMPLATE_CONTENT: Record<TemplateKey, string> = {
  primeiro_contato: 'Olá! Boas-vindas à {{nome_clinica}}. Ficamos felizes com seu contato! Pra te conhecer melhor: qual o seu nome?',
  pergunta_queixa: 'Prazer! Pra te atender melhor, me conta: o que você está buscando ou o que gostaria de resolver?',
  explicacao_processo:
    'Levando em conta o que o paciente disse ser a necessidade dele, explicar que o primeiro passo é um atendimento inicial com {{nome_profissional}}, focado exatamente nisso, que vai entender melhor o caso e montar um plano personalizado. Perguntar se pode agendar esse atendimento inicial.',
  valor_e_horarios: 'O valor do atendimento inicial é {{valor_consulta}}. Atendemos {{horario_atendimento}}. Quando prefere vir?',
  agendamento_confirmado:
    'Agendado para {{data_consulta}} às {{horario_consulta}}! Pra facilitar sua vinda: aceitamos Pix, cartão e dinheiro. Ficamos em {{endereco}}. Chegue com 5 minutos de antecedência. Qualquer dúvida é só chamar — te esperamos!',
  orientacao_procedimento_longo:
    'Só um aviso: seu atendimento vai levar mais tempo que o normal. Pra ficar mais confortável: use roupas leves, pode trazer fone de ouvido, e pode se alimentar normalmente antes. Qualquer coisa é só pedir!',
  followup_falta_sem_remarcar:
    'Olá! Aqui é a {{nome_clinica}}. Vimos que você não conseguiu comparecer no seu último horário e ainda não remarcamos. Sabemos que imprevistos acontecem — quer escolher um novo horário? {{link_agendamento}}',
  followup_atraso: 'Olá! Aqui é a {{nome_clinica}}. Você está chegando? Ficamos preocupados quando não vemos você no horário — está tudo bem?',
  escalar_atendimento_humano: HANDOFF_FALLBACK_MESSAGE,
  contato_recorrente:
    'Olá! Que bom ter você de volta. Já te conhecemos por aqui — em breve alguém da equipe retorna sua mensagem. Se for urgente, me conta o que você precisa que já sinalizamos.',
  campanha_sem_visita: 'Olá {{nome_cliente}}! Faz um tempo que não te vemos por aqui (última visita: {{ultima_visita}}). Quer marcar um retorno?',
  campanha_orcamento_aberto: 'Olá {{nome_cliente}}! Seu orçamento de {{valor_orcamento}} continua disponível. Posso te ajudar a agendar?',
  mensagem_ausencia:
    'Hoje não temos atendimento por aqui — assim que abrirmos, te respondemos! Se for urgente, deixa sua mensagem que já vemos com atenção assim que voltarmos.',
}

const BELEZA_OVERRIDES: Partial<Record<TemplateKey, string>> = {
  pergunta_queixa: 'Prazer! Me conta: o que você gostaria de fazer, ou qual procedimento tá buscando?',
  explicacao_processo:
    'Levando em conta o que você me contou, explicar que o primeiro passo é agendar um horário com {{nome_profissional}}, que vai te atender com atenção no que você precisa. Perguntar se pode agendar esse horário.',
  valor_e_horarios: 'O valor desse atendimento é {{valor_consulta}}. Atendemos {{horario_atendimento}}. Quando prefere vir?',
}

const ADVOGADO_OVERRIDES: Partial<Record<TemplateKey, string>> = {
  pergunta_queixa: 'Pra te ajudar melhor, me conta: qual é a sua situação ou o que você precisa resolver?',
  explicacao_processo:
    'Levando em conta o que você me contou, explicar que o primeiro passo é uma consulta inicial com {{nome_profissional}}, pra entender bem o seu caso e montar a melhor estratégia. Perguntar se pode agendar essa consulta.',
  valor_e_horarios: 'O valor dessa consulta inicial é {{valor_consulta}}. Atendemos {{horario_atendimento}}. Quando prefere vir?',
}

// Chave = slug em `niches.slug`. Nicho sem entrada aqui (inclusive "outro")
// cai no BASE (tom de saúde/clínica) — cobre os nichos de saúde
// explicitamente por clareza, mesmo sendo o mesmo texto do BASE.
const NICHE_OVERRIDES: Record<string, Partial<Record<TemplateKey, string>>> = {
  estetica: BELEZA_OVERRIDES,
  unhas: BELEZA_OVERRIDES,
  barbearia: BELEZA_OVERRIDES,
  cabeleireiro: BELEZA_OVERRIDES,
  sobrancelha: BELEZA_OVERRIDES,
  advogado: ADVOGADO_OVERRIDES,
}

// Salão/beleza tem procedimento simples o bastante pra não precisar de
// "explicação do processo" nem dos cards de acompanhamento mais elaborados
// (procedimento longo, follow-up de falta/atraso, campanha) — dono pediu
// só 5 cards visíveis pra esse grupo: primeiro contato, procedimento
// desejado, valor+link, confirmação e ausência. `hidden: true` some da
// lista em /configuracoes/mensagens (mesmo botão "Excluir" que o dono já
// usa manualmente) sem apagar a linha — se algum dia precisar, ainda dá
// pra reativar direto no banco. `escalar_atendimento_humano` e
// `contato_recorrente` escondidos também caem no fallback padrão do
// código (ainda funcionam, só não aparecem pra edição).
const HIDDEN_KEYS_BY_GROUP: Record<NicheGroup, TemplateKey[]> = {
  saude: [],
  beleza: [
    'explicacao_processo',
    'orientacao_procedimento_longo',
    'followup_falta_sem_remarcar',
    'followup_atraso',
    'escalar_atendimento_humano',
    'contato_recorrente',
    'campanha_sem_visita',
    'campanha_orcamento_aberto',
  ],
  // "orientacao_procedimento_longo" é 100% de saúde ("roupas leves", "fone
  // de ouvido", "se alimentar antes") e dispara automático pra qualquer
  // atendimento >= PROCEDIMENTO_LONGO_MIN — uma reunião jurídica de 90min
  // mandaria essa mensagem sem nenhum sentido pro cliente.
  juridico: ['orientacao_procedimento_longo'],
}

// Cartão escondido (HIDDEN_KEYS_BY_GROUP) não deve só sumir da tela de
// edição — resolveTemplate filtra hidden=true e cai no fallback hardcoded,
// que reproduziria o mesmo texto fora de contexto. Quem dispara uma
// automação opcional (não essencial ao fluxo) deve checar isso antes de
// mandar a mensagem.
export function isTemplateHiddenForNiche(nicheSlug: string | null | undefined, templateKey: TemplateKey): boolean {
  return HIDDEN_KEYS_BY_GROUP[nicheGroupOf(nicheSlug)].includes(templateKey)
}

// Chamado uma vez, logo após criar o tenant (ver src/app/actions/cadastro.ts)
// — insere o roteiro padrão completo pra todo template_key ainda sem linha,
// com o tom e a lista de cards certos pro nicho escolhido no cadastro.
// Idempotente (on conflict do nothing) pra poder rodar de novo com
// segurança em tenants antigos que nasceram antes dessa seed existir.
export async function seedDefaultTemplates(tenantId: string, nicheSlug: string | null): Promise<void> {
  const overrides = (nicheSlug && NICHE_OVERRIDES[nicheSlug]) || {}
  const hiddenKeys = new Set(HIDDEN_KEYS_BY_GROUP[nicheGroupOf(nicheSlug)])
  const admin = createAdminClient()
  const rows = TEMPLATE_KEYS.map(({ key }) => ({
    tenant_id: tenantId,
    template_key: key,
    content: overrides[key] ?? BASE_TEMPLATE_CONTENT[key],
    hidden: hiddenKeys.has(key),
  }))
  await admin.from('message_templates').upsert(rows, { onConflict: 'tenant_id,template_key', ignoreDuplicates: true })
}

export const TEMPLATE_KEYS = [
  { key: 'primeiro_contato', label: 'Primeiro contato' },
  { key: 'pergunta_queixa', label: 'Pergunta sobre a necessidade' },
  { key: 'explicacao_processo', label: 'Explicação do processo' },
  { key: 'valor_e_horarios', label: 'Valor, horários e link de agendamento' },
  { key: 'agendamento_confirmado', label: 'Agendamento confirmado' },
  { key: 'orientacao_procedimento_longo', label: 'Orientação — procedimento longo' },
  { key: 'followup_falta_sem_remarcar', label: 'Follow-up — faltou e não remarcou' },
  { key: 'followup_atraso', label: 'Follow-up — atraso' },
  { key: 'escalar_atendimento_humano', label: 'Escalonamento pra atendimento humano (IA não sabe responder)' },
  { key: 'contato_recorrente', label: 'Contato que já falou antes (sessão expirada)' },
  { key: 'campanha_sem_visita', label: 'Campanha — sem visita há um tempo' },
  { key: 'campanha_orcamento_aberto', label: 'Campanha — orçamento em aberto' },
  { key: 'mensagem_ausencia', label: 'Mensagem de ausência (fora do dia/horário de atendimento)' },
] as const
