// Resolução central de template + variável — usada tanto pelo bot de
// primeiro contato (webhook Chatwoot) quanto por disparo manual/automações
// (confirmação de agendamento, follow-up de falta/atraso). Uma função só
// evita template divergir de contexto pra contexto.
import { createAdminClient } from '@/lib/supabase/admin'
import { HANDOFF_FALLBACK_MESSAGE } from '@/lib/conversational-bot'

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

// Roteiro padrão pra todo tenant novo, criado a partir do script
// universalizado que o dono validou pra clientes reais (ver
// 026_atualiza_script_mensagens.sql) — dono personaliza depois em
// /configuracoes/mensagens. Sem isso, tenant nasce sem nenhuma linha em
// message_templates e cai nos fallbacks genéricos hardcoded espalhados
// pelo código, que nunca foram pensados como texto final pro cliente.
const DEFAULT_TEMPLATE_CONTENT: Record<(typeof TEMPLATE_KEYS)[number]['key'], string> = {
  primeiro_contato: 'Olá! Boas-vindas à {{nome_clinica}}. Ficamos felizes com seu contato! Pra te conhecer melhor: qual o seu nome?',
  pergunta_queixa: 'Prazer! Pra te atender melhor, me conta: o que você está buscando ou o que gostaria de resolver?',
  explicacao_processo:
    'Combinamos assim: primeiro um atendimento inicial com {{nome_profissional}}, pra entender direitinho o que você precisa e te passar todos os detalhes. Podemos agendar esse primeiro atendimento?',
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
}

// Chamado uma vez, logo após criar o tenant (ver src/app/actions/cadastro.ts)
// — insere o roteiro padrão completo pra todo template_key ainda sem linha.
// Idempotente (on conflict do nothing) pra poder rodar de novo com segurança
// em tenants antigos que nasceram antes dessa seed existir.
export async function seedDefaultTemplates(tenantId: string): Promise<void> {
  const admin = createAdminClient()
  const rows = TEMPLATE_KEYS.map(({ key }) => ({
    tenant_id: tenantId,
    template_key: key,
    content: DEFAULT_TEMPLATE_CONTENT[key],
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
] as const
