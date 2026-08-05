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

### Nichos suportados
Armazenados em tabela `niches` (não enum fixo) — adicionar um nicho novo é inserir uma linha,
sem gerar migration. Um nicho sem módulo específico desenvolvido ainda simplesmente usa o
núcleo genérico (Agenda + Clientes + Financeiro) até o módulo dele ser construído.

Lista atual (12): Odontologia, Estética/Beleza, Design de unhas, Barbearia/Salão de cabelo,
Fisioterapia, Psicologia, Nutrição, Personal trainer, Medicina/Clínica médica, Veterinário,
Advocacia, Outro.

`tenants.niche_id` referencia `niches.id` (fk, não mais enum `niche_type`).

```
tenants
  id, name, niche_id (fk -> niches.id), theme_palette,
  chatwoot_account_id, evolution_instance_name, created_at

users
  id, tenant_id, email, role, auth_id (fk supabase auth)

clients  (pacientes / clientes / partes, dependendo do nicho)
  id, tenant_id, name, phone, document, birth_date, tags[],
  email, gender, zip_code, address_street, address_complement,
  address_neighborhood, address_city, address_state,
  referral_source (como conheceu), emergency_contact_name, emergency_contact_phone,
  guardian_name, guardian_document, guardian_birth_date (para pacientes menores de idade),
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

## Painel Admin (uso exclusivo de Cauê)

Separado do CRM que o cliente final usa — acesso restrito, controla o ciclo de vida de todos os
tenants (assinatura, trial, cobrança manual). Segue o mesmo modelo já usado no Orça Fácil.

### Modelo de dados
- `tenants` ganha: `subscription_status` (trial | active | overdue | cancelled),
  `trial_ends_at`, `monthly_price` (definido por negociação individual, sem preço fixo),
  `next_due_date`, `admin_notes`
- `admin_users` — tabela separada de `users`; só quem está aqui acessa o painel admin

### Acesso e segurança
- Rotas do painel admin (`/admin/*`) rodam no **backend** (Route Handlers / Server Actions),
  usando a Supabase **service role key** — isso ignora RLS de propósito, porque o admin
  precisa ver todos os tenants, não só o próprio
- Toda rota admin confirma primeiro se o `auth_id` do usuário logado existe em `admin_users`
  antes de retornar qualquer dado — sem essa checagem, nenhum acesso é liberado
- Service role key nunca é exposta ao frontend, só usada em código server-side

### Funcionalidades do MVP
- Lista de todos os tenants: nome, nicho, status (trial/ativo/vencido/cancelado), dias restantes
  de trial ou próximo vencimento
- Criar/editar `trial_ends_at` manualmente por cliente (já que varia caso a caso)
- Definir/editar `monthly_price` por cliente (negociação individual)
- Ações rápidas: marcar como pago (avança `next_due_date`), ativar, cancelar
- Campo de observações livre por tenant (`admin_notes`) — contexto de negociação, combinados
- Métricas simples no topo: total de tenants ativos, em trial, vencendo em 7 dias, cancelados

### Fora de escopo por enquanto
- Cobrança automática (Stripe/Pagar.me) — decisão explícita de manter controle manual, igual ao
  Orça Fácil
- Notificação automática de vencimento pro cliente (pode entrar como automação n8n futuramente)



## Adiado deliberadamente (visto no sistema de referência, não incluído agora)

- **Relatórios de Inteligência / Analytics** — painel de métricas (% comparecimento, cancelamentos,
  novos pacientes, etc.). Adiado porque uma instalação nova não tem dado histórico suficiente pra
  esse painel ser útil nos primeiros meses — construir antes de ter volume é esforço sem retorno.
  Retomar quando algum tenant tiver uso real acumulado.
- **Site da Clínica (booking pública + landing page)** — feature separada do CRM em si. Segue o
  mesmo padrão já usado pra Orça Fácil/PlayNex (landing page própria, HTML/CSS/JS), tratada como
  projeto à parte quando fizer sentido, não como módulo do CRM.
- **Convênio/plano de saúde no cadastro de paciente** — não se aplica ao caso da Jayne (clínica
  particular). Não implementar a menos que um tenant futuro realmente precise.

## Múltiplos profissionais por tenant — planejado, não implementado ainda

Hoje o schema assume implicitamente 1 profissional por tenant (correto pro caso da Jayne, que é
solo). Alguns nichos futuros (barbearia, clínica médica, fisioterapia com equipe) vão precisar
de múltiplos profissionais na mesma conta, cada um com sua própria agenda visível/filtrável —
exatamente como o "Agendas" (lista de profissionais) do Codental.

**Gatilho pra implementar**: antes de onboardar o primeiro tenant que realmente precise disso.
Não implementar antes — seria trabalho especulativo sem cliente real validando o formato.

### Desenho já pronto pra quando for necessário

```
professionals
  id, tenant_id, name, color (cor de identificação na agenda),
  user_id (fk -> users, nullable — nem todo profissional precisa ter login no sistema),
  active, created_at

appointments ganha: professional_id (fk -> professionals)
```

No cadastro do tenant, criar automaticamente 1 `professional` default = o próprio dono (mesmo
padrão do Codental, que já mostra "Jayne tofoli" na barra lateral sem setup manual). Tenants
solo nunca precisam nem saber que essa tabela existe — só aparece a opção "Adicionar
profissional" quando fizer sentido.

**Decisão de UI (atualizada)**: o botão "+ Adicionar profissional" já aparece na barra lateral
da Agenda desde o MVP da Jayne, ao lado do nome dela — mesmo sem a tabela `professionals` e o
fluxo completo implementados ainda. Ao clicar, mostra uma mensagem simples tipo "Em breve" (toast
ou modal leve) em vez de abrir um formulário funcional. Isso mantém a percepção visual de produto
maduro sem adiantar trabalho de backend especulativo — a implementação completa (tabela,
migration retroativa, filtro por profissional na agenda) segue o gatilho descrito acima: só
quando o primeiro tenant multi-profissional for confirmado.



**Fase 1 — Fundação multi-tenant**
- Schema Supabase com RLS por tenant_id
- Fluxo de cadastro com seleção de nicho
- Núcleo: Agenda + Clientes + Financeiro (genérico, sem módulo de nicho ainda)

### Módulo Agenda — detalhamento

**Visualização**: grid semana/dia, faixa de horário determinada por `tenants.business_hours`
(configurável por dia da semana, com toggle ativo/inativo — ex: sábado desativado por padrão).

**Criar/editar evento** — modal com dois tipos:
- **Consulta**: paciente (busca existente ou cadastro inline, sem sair do modal), data, horário,
  duração, observações, toggle "enviar mensagem de confirmação" (dispara automação n8n/WhatsApp
  quando "Sim"), etiqueta (cor + nome, tabela `appointment_labels`)
- **Compromisso**: bloqueio de agenda sem paciente vinculado (ex: "Limpeza do ar condicionado",
  intervalo) — usa campo `title` em vez de `client_id`

Schema: `appointments.type` (consulta | compromisso), `client_id` nullable (obrigatório só pra
consulta, via constraint), `label_id` opcional.

**Fora do MVP, fase 2**:
- "Encontrar horário" — sugestão automática do próximo horário livre disponível
- "Retornar em" — agendamento automático de retorno (ex: 6 meses) ao criar a consulta original


- Odontograma, Anamnese, Tratamentos, Orçamentos, Evoluções
- Integração com Chatwoot Account própria + instância WhatsApp própria

**Fase 2.5 — Painel Admin**
- CRUD de tenants (status, trial, preço, observações) — ver seção "Painel Admin" acima
- Pode ser feito em paralelo à Fase 2, já que não depende do módulo do dentista


- Interface própria de chat dentro do sistema, consumindo API do Chatwoot (ver seção
  Arquitetura) — cliente nunca vê o Chatwoot diretamente
- Automações (n8n): confirmação 24h antes / lembrete 2h antes, sem custo por mensagem

**Fase 4 — Módulo Salão de Unhas (piloto teste grátis)**
- Validar se núcleo comum realmente serve sem retrabalho
- Desenhar módulo específico (catálogo, galeria antes/depois)

**Fase 5 — Validação e precificação**
- Após ambos pilotos rodando bem, avaliar modelo de cobrança pra escalar prospecção
