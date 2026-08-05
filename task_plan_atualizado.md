# NexHub CRM — Task Plan

## V — Visão

Sistema de gestão (agenda + clientes + financeiro + atendimento via WhatsApp) vendido como SaaS
para múltiplos nichos de prestadores de serviço (odontologia, estética/beleza, advocacia, e
futuros). Cada cliente (tenant) tem seus dados 100% isolados dos demais — nunca compartilhar
banco de dados lógico, conta Chatwoot, ou instância WhatsApp entre tenants.

Modelo de entrada: cadastro seleciona o nicho (igual ao fluxo do Orça Fácil) e o dashboard já
nasce configurado pra aquela realidade, sem telas genéricas que não se aplicam ao negócio da
pessoa.

Primeiros casos de uso confirmados:
1. Clínica odontológica (Jayne Tofoli) — validação piloto
2. Salão de design de unhas (amiga, teste grátis) — segundo piloto, valida a tese multi-nicho

## L — Link (estrutura de acesso)

Seguindo o padrão já usado no Nexvix (orcafacil.nexvix.com.br, poliform.nexvix.com.br):

- Domínio de produto: `nexhub.nexvix.com.br` ou domínio próprio a definir quando for produtizado
- Cada tenant pode ter subdomínio próprio no futuro (ex: `jaynetofoli.nexvix.com.br`), mas no
  MVP todos os tenants acessam pela mesma URL base com login + seleção de conta
- Painel admin (seu, Cauê) separado do painel do cliente final

## A — Arquitetura

### Stack
- Next.js + Supabase (Postgres + Auth + RLS) + Vercel — padrão já usado nos outros produtos
- WhatsApp/atendimento: NexHub já em produção (Evolution API + Chatwoot + n8n na VPS Contabo)

### Isolamento multi-tenant (crítico, não negociável)
- **Banco de dados**: RLS por `tenant_id` em toda tabela — nenhuma query pode vazar dado entre
  tenants, mesmo com bug de aplicação
- **Chatwoot**: cada tenant = uma Account separada (decisão já registrada) — isolamento nativo
  da plataforma, não depende de configuração manual de permissão
- **Evolution API**: cada tenant = uma instância de WhatsApp separada

### Modelo de dados — núcleo comum (todo tenant usa)

```
tenants
  id, name, niche (enum: dentista | unhas | advogado | outro),
  chatwoot_account_id, evolution_instance_name, created_at

users
  id, tenant_id, email, role, auth_id (fk supabase auth)

clients  (pacientes / clientes / partes, dependendo do nicho)
  id, tenant_id, name, phone, document, birth_date, tags[],
  niche_data (jsonb — campos livres específicos do nicho)

appointments
  id, tenant_id, client_id, datetime, duration_min,
  status (pending | confirmed | cancelled | done | no_show),
  notes

transactions  (financeiro)
  id, tenant_id, client_id, appointment_id, amount,
  status (receivable | received | overdue), due_date
```

### Módulos específicos por nicho (carregados condicionalmente por `tenants.niche`)

**Dentista**
```
odontogram_records   — id, client_id, tooth_number, status, updated_at
anamnesis            — id, client_id, questionnaire (jsonb)
treatments           — id, client_id, procedure, status, budget_id
treatment_budgets    — id, client_id, items (jsonb), total, approved_at
evolutions           — id, client_id, appointment_id, note
```

**Salão de unhas** (a desenhar em detalhe quando o piloto confirmar)
```
service_catalog      — id, tenant_id, name, price, duration_min
gallery               — id, client_id, before_url, after_url, service_id
allergy_notes         — id, client_id, note
```

**Advogado** (a desenhar quando/se entrar esse nicho)
```
cases                — id, client_id, case_number, status
deadlines            — id, case_id, description, due_date
case_updates          — id, case_id, note, created_at
```

### Interface de atendimento (WhatsApp) — decisão de arquitetura

O cliente final (dentista, salão, etc.) **nunca** acessa o Chatwoot diretamente — nem tela de
login, nem URL do Chatwoot em nenhum momento. O CRM constrói sua própria interface de chat,
consumindo a API do Chatwoot como backend:

- Lista de conversas, histórico de mensagens e envio: via API REST do Chatwoot
  (`GET /api/v1/accounts/{id}/conversations`, `POST .../messages`, etc.)
- Tempo real (novas mensagens chegando sem reload): via Chatwoot ActionCable (WebSocket) ou
  polling como fallback mais simples no MVP
- Visual: 100% nos tokens de cor do tenant (petroleo/bege/neutro) — não herda nenhum estilo do
  Chatwoot
- Autenticação: o backend do CRM guarda o token de agente do Chatwoot daquele tenant (nunca
  exposto ao frontend); o usuário só autentica no Supabase Auth do próprio CRM

Isso é mais esforço de desenvolvimento que embutir o Chatwoot via iframe, mas é a decisão
correta dado o investimento em identidade visual coesa por cliente — um iframe do Chatwoot
quebraria a experiência visual unificada.

### Dashboard dinâmico
O frontend renderiza os módulos de acordo com `tenants.niche` — o dentista nunca vê tela de
catálogo de serviço de unha, e vice-versa. Núcleo (Agenda, Clientes, Financeiro) é sempre igual
visualmente, só o conteúdo dos módulos extras muda.

## E — Estilo

### Paletas disponíveis (cliente escolhe no cadastro, igual seleção de nicho)
O tenant escolhe uma das 3 paletas pré-definidas — resolve gosto pessoal sem custo de suporte
nem retrabalho de design por cliente. Estrutura de tokens já validada no preview React.

**1. Azul-petróleo**
- Fundo `#FAFAF9` · Superfície `#FFFFFF` · Accent `#0F6E56` · Texto `#1C1C1A` · Secundário `#5F5E5A` · Borda `#E8E6DF`

**2. Bege / terracota**
- Fundo `#FAF8F5` · Superfície `#FFFFFF` · Accent `#B45309` · Texto `#292420` · Secundário `#78716C` · Borda `#EDE6DC`

**3. Neutro**
- Fundo `#FFFFFF` · Superfície `#FAFAFA` · Accent `#4F46E5` · Texto `#18181B` · Secundário `#71717A` · Borda `#E4E4E7`

Armazenado em `tenants.theme_palette` (enum: `petroleo | bege | neutro`). O frontend lê esse
campo e aplica os tokens via CSS variables — nenhuma lógica condicional espalhada pelo código,
um único ponto de leitura no layout raiz.

### Cores de status (agenda) — fixas, não fazem parte da escolha de paleta
- 🔵 Pendente / aguardando confirmação: azul
- 🟢 Confirmado: verde
- 🔴 Cancelado / desmarcado: vermelho

Status usa cor semântica universal (sempre a mesma, independente da paleta escolhida) pra não
gerar ambiguidade — ex: se o tenant escolhesse uma paleta com accent verde, um agendamento
"confirmado" ficaria confuso com botões da marca.

## G — Gatilho (fases de execução)

**Fase 1 — Fundação multi-tenant**
- Schema Supabase com RLS por tenant_id
- Fluxo de cadastro com seleção de nicho
- Núcleo: Agenda + Clientes + Financeiro (genérico, sem módulo de nicho ainda)

**Fase 2 — Módulo Dentista (piloto Jayne)**
- Odontograma, Anamnese, Tratamentos, Orçamentos, Evoluções
- Integração com Chatwoot Account própria + instância WhatsApp própria

**Fase 3 — Atendimento WhatsApp embutido no CRM**
- Interface própria de chat dentro do sistema, consumindo API do Chatwoot (ver seção
  Arquitetura) — cliente nunca vê o Chatwoot diretamente
- Automações (n8n): confirmação 24h antes / lembrete 2h antes, sem custo por mensagem

**Fase 4 — Módulo Salão de Unhas (piloto teste grátis)**
- Validar se núcleo comum realmente serve sem retrabalho
- Desenhar módulo específico (catálogo, galeria antes/depois)

**Fase 5 — Validação e precificação**
- Após ambos pilotos rodando bem, avaliar modelo de cobrança pra escalar prospecção
