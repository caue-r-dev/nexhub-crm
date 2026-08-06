# Progress — NexHub CRM

## Fase 1 — Fundação multi-tenant

### Concluído

- Scaffold Next.js 16 (App Router, Turbopack) + Tailwind v4 + TypeScript, seguindo padrão
  Orça Fácil/Poliform.
- Supabase conectado (`.env.local` com URL + publishable key + secret key do projeto
  `mbgndoxqntynapfwatim`). Migration `001_fase1_fundacao_multitenant.sql` já aplicada
  manualmente pelo usuário — não reaplicada.
- `src/lib/supabase/types.ts` — types TS escritos manualmente a partir do schema da migration
  (client/server/admin do Supabase não têm acesso a login CLI, então não foi possível rodar
  `supabase gen types`; atualizar manualmente a cada nova migration).
- `src/lib/supabase/{client,server,admin}.ts` — clients browser/server/service-role.
- `src/proxy.ts` — proxy (Next 16 renomeou `middleware.ts` → `proxy.ts`) cuidando de sessão e
  redirecionando não-autenticados pra `/login`.
- `src/app/globals.css` — 3 paletas (petroleo/bege/neutro) como CSS vars por `[data-palette]`,
  mapeadas pro Tailwind via `@theme inline`. Cores de status da agenda (pending/confirmed/
  cancelled) fixas, fora do sistema de paleta.
- `src/lib/tenant.ts` (`getCurrentTenant`) + `src/app/layout.tsx` — layout raiz lê
  `tenants.theme_palette` do tenant logado e aplica `data-palette` no `<html>`. Único ponto de
  leitura, sem lógica condicional espalhada.
- Fluxo de cadastro `/cadastro` (`src/components/cadastro/CadastroWizard.tsx` +
  `src/app/actions/cadastro.ts`):
  - Step 1: nome do negócio, email, senha.
  - Step 2: seleção de nicho via cards visuais (dentista/unhas/advogado/outro).
  - Step 3: seleção de paleta com preview real (mini mockup com cores reais de cada paleta,
    não só quadrado de cor).
  - Ao concluir: cria `auth.users` (via admin API, `email_confirm: true`), cria `tenants`, cria
    `users` vinculado, autentica sessão, redireciona pra `/`.
- `/login` básico (`src/app/actions/login.ts` + `src/components/login/LoginForm.tsx`).
- **Testado end-to-end no browser**: cadastro completo (Clínica Teste NexHub → Dentista →
  Bege/terracota) → confirmado `data-palette="bege"` aplicado no `<html>` renderizado pelo
  servidor.

### Atualização — schema `niches` (task_plan_atualizado2.md)

Usuário rodou migration trocando `tenants.niche` (enum fixo) por `tenants.niche_id` (fk ->
`niches.id`), com tabela `niches` seedada (12 nichos, campos slug/label/icon/sort_order/active).
Adicionar nicho novo agora é inserir linha, sem migration.

Código atualizado:
- `src/lib/supabase/types.ts` — removido `NicheType`, adicionada tabela `niches`, `tenants.niche_id`.
- `src/lib/niches.ts` — `getNiches()` busca do Supabase (`active = true`, ordenado por
  `sort_order`) em vez de array hardcoded.
- `src/lib/dynamic-icon.tsx` — resolve ícone Lucide pelo nome salvo em `niches.icon` (fallback
  `HelpCircle`). Instalado `lucide-react`.
- `src/app/actions/cadastro.ts` — `nicheId` em vez de `niche`, insere `tenants.niche_id`.
- `CadastroWizard` recebe `niches: Niche[]` via prop (fetch server-side em
  `src/app/cadastro/page.tsx`), cards mostram ícone real de cada nicho.

Retestado end-to-end no browser: cadastro "Salão Teste 2" → Design de unhas → Neutro →
confirmado no banco `niches.slug = 'unhas'` + `theme_palette = 'neutro'`, e `data-palette="neutro"`
aplicado no `<html>`.

### Atualização — schema Painel Admin (task_plan3.md)

Usuário rodou migration nova: `tenants` ganhou `subscription_status` (trial|active|overdue|
cancelled), `trial_ends_at`, `monthly_price`, `next_due_date`, `admin_notes`; tabela
`admin_users` (id, auth_id, email, created_at) criada, separada de `users`. `src/lib/supabase/
types.ts` atualizado pra refletir (build validado, sem regressão).

Painel Admin em si (rotas `/admin/*`, CRUD de tenants, checagem `admin_users`) é Fase 2.5 —
não implementado ainda, fora do escopo do checkpoint atual (fluxo de cadastro + núcleo).

### Checkpoint

Fluxo de cadastro completo + núcleo funcional básico (Agenda, Clientes, Financeiro) —
aguardando validação do usuário antes de considerar a Fase 1 encerrada.

### Núcleo — Agenda, Clientes, Financeiro (concluído)

Layout `(dashboard)` com `AppNav` compartilhada (Início/Agenda/Clientes/Financeiro).

- **Clientes** (`/clientes`, `/clientes/novo`, `/clientes/[id]`, `/clientes/[id]/editar`):
  lista com busca (nome/telefone/documento via `ilike` OR), form de criação/edição
  (`ClientForm`), ficha básica com últimos agendamentos.
- **Agenda** (`/agenda`, `/agenda/novo`): view semana/dia via `searchParams` (`view`, `date`),
  navegação anterior/próximo, criar agendamento (`AppointmentForm`, dropdown de clientes),
  troca de status inline (`StatusSelect`) com cores fixas (pending=azul, confirmed=verde,
  cancelled=vermelho, done/no_show=cinza) — client component chamando server action, refresh
  automático via `revalidatePath`.
- **Financeiro** (`/financeiro`, `/financeiro/novo`): cards recebido/a receber/pendências
  (somados client-side a partir da lista), lançamento (`TransactionForm`, cliente opcional),
  troca de status inline (`TransactionStatusSelect`).

**Bug de timezone corrigido**: `datetime-local` do form mandava string naive pro Postgres,
gravando 3h adiantado (14:00 virava 11:00 exibido). Corrigido em duas pontas:
1. `AppointmentForm` converte pra ISO (`new Date(datetime).toISOString()`) antes de mandar —
   grava o instante UTC correto.
2. `src/lib/date-range.ts` reescrito com funções BR-aware (`startOfDay`, `startOfWeek`,
   `dayOfMonthBR`, `weekdayIndexBR`, `BR_TZ`) — cálculo de dia/semana e toda formatação de
   horário exibida usa `timeZone: 'America/Sao_Paulo'` explícito, já que o server (Vercel)
   roda em UTC e não dá pra confiar no fuso do processo. Brasília não tem mais horário de
   verão (desde 2019), então UTC-3 fixo é seguro pra essa simplificação de MVP mono-região.

Testado end-to-end no browser: criar cliente → criar agendamento (horário conferido exato:
09:30 digitado = 09:30 exibido) → marcar lançamento financeiro como recebido (soma recalcula
em tempo real).

## Fase 2.5 — Painel Admin (concluído)

Rotas `/admin/*` completamente separadas da auth de tenant:
- `/admin/login` fora do guard (evita loop de redirect), `(panel)` route group com
  `layout.tsx` que checa `getCurrentAdmin()` (via service role, `admin_users.auth_id`) e
  redireciona pra `/admin/login` se não for admin.
- `src/proxy.ts` ignora `/admin/*` completamente — auth de tenant não interfere.
- Todas as queries do painel usam `createAdminClient()` (service role, ignora RLS de
  propósito) — é o único jeito de ver todos os tenants de uma vez, conforme especificado.
- Dashboard (`/admin`): métricas (ativos/trial/vencendo em 7 dias/cancelados) + lista de
  tenants com nicho, status, dias restantes ou vencidos.
- `/admin/tenants/[id]`: editar `trial_ends_at`/`monthly_price`/`next_due_date`/`admin_notes`;
  ações rápidas "Marcar como pago" (avança `next_due_date` em 1 mês a partir de
  hoje/vencimento anterior, o que for maior, e ativa), "Ativar", "Cancelar".
- Criado usuário admin real: `caueribeiro.crds@gmail.com` (senha temporária gerada, deve ser
  trocada) + linha em `admin_users`.

Testado end-to-end no browser: login admin → dashboard lista os 4 tenants de teste → editar
"Clínica Teste NexHub" → "Marcar como pago" → confirmado na lista (status Ativo, dot verde,
"31d restantes", contagem de Ativos atualizada de 0→1).

## Agenda — detalhamento consulta/compromisso (task_plan4.md)

Migration já rodada pelo usuário: `appointments` ganhou `type` (consulta|compromisso),
`title`, `label_id`; nova tabela `appointment_labels` (tenant_id/name/color); `tenants` ganhou
`business_hours` (jsonb por dia da semana, com default sáb/dom desativado). **Nota**: os
campos extras de `clients` mencionados no mesmo task_plan (email, gênero, endereço,
contato de emergência, responsável) **não** entraram nessa migration — só o que existe de
fato no banco foi implementado.

- `types.ts`: `AppointmentType`, `BusinessHours`, tabela `appointment_labels`, `appointments`
  atualizada (`client_id` agora nullable, `type`/`title`/`label_id`).
- `createAppointmentAction`: valida client obrigatório só pra `consulta`, título obrigatório
  só pra `compromisso`.
- `createClientQuickAction` (sem redirect) — extraído de `createClientAction` pra permitir
  cadastro de cliente inline dentro do modal de agendamento, sem navegar pra outra página.
- `createLabelAction`: cria etiqueta (nome + cor, 6 presets) na hora, sem sair do form.
- `AppointmentForm`: toggle Consulta/Compromisso (troca cliente↔título), "+ Cadastrar novo
  cliente" inline, "+ Nova etiqueta" inline, ambos atualizam o select e auto-selecionam o
  item criado.
- Agenda (lista semana/dia): compromisso mostra título em vez de cliente; chip colorido da
  etiqueta exibido no card.

**Não implementado nesta passada** (deferido, não crítico pro MVP funcionar):
- Grid por faixa de horário respeitando `business_hours` — agenda continua como lista de
  cards por dia, não um grid de horas. `business_hours` existe no schema com default mas
  ainda não tem tela de configuração nem é lido pela UI.
- Toggle "enviar mensagem de confirmação" citado no plano — não construído, porque a
  automação n8n/WhatsApp que consumiria esse flag só existe na Fase 3. Adicionar o toggle
  agora seria UI sem efeito nenhum.
- "Encontrar horário" e "retornar em" automático — explicitamente fora do MVP no próprio
  task_plan4.md.

Testado end-to-end no browser: compromisso "Limpeza do ar condicionado" com etiqueta nova
"Manutenção" (verde-petróleo) → aparece certo na agenda (dia/horário exatos, chip colorido).
Consulta: cliente "João Inline" criado inline sem sair do form, auto-selecionado. Conferido
direto no banco (`type`, `title`, `label_id`, `appointment_labels` relacionados corretos).

## Fase 2 — Módulo Dentista (task_plan5.md, idêntico ao 4)

Nenhuma tabela do módulo existia no banco — diferente das fases anteriores, dessa vez não
veio SQL pronto do usuário. Escrevi `002_fase2_modulo_dentista.sql` (odontogram_records,
anamnesis, treatment_budgets, treatments, evolutions + RLS no mesmo padrão da 001), usuário
rodou no Supabase Dashboard, só então implementei o código.

- `types.ts`: `OdontogramStatus`, `TreatmentStatus`, `BudgetItem` + as 5 tabelas novas.
- `getCurrentTenantNicheSlug()` em `lib/tenant.ts` — módulos de nicho só carregam pro slug
  certo (`dentista`), sem lógica espalhada: um único ponto de leitura.
- `ClientTabs` — nav de abas (Ficha/Odontograma/Anamnese/Tratamentos/Orçamentos/Evoluções) só
  renderizada na ficha do cliente quando `nicheSlug === 'dentista'`.
- **Odontograma** (`/clientes/[id]/odontograma`): grid FDI completo (32 dentes, permanentes),
  cada dente é um select colorido por status (saudável/cariado/restaurado/ausente/implante/
  canal/extração indicada), upsert on-change (`tooth_number` + `client_id` unique).
- **Anamnese** (`/clientes/[id]/anamnese`): questionário fixo (alergias, medicamentos,
  diabetes/hipertensão/cardiopatia/gestante, tratamentos anteriores, observações) salvo como
  jsonb, upsert por `client_id` (um registro por paciente, editável).
- **Orçamentos** (`/clientes/[id]/orcamentos`): itens dinâmicos (descrição/qtd/valor unit.),
  total calculado no client E recalculado no server (nunca confia no valor mandado), botão
  Aprovar seta `approved_at`.
- **Tratamentos** (`/clientes/[id]/tratamentos`): procedimento + vínculo opcional a um
  orçamento existente, status (planejado/em andamento/concluído/cancelado) editável inline.
- **Evoluções** (`/clientes/[id]/evolucoes`): anotação de acompanhamento, vínculo opcional a
  uma consulta existente, timeline mais recente primeiro.

**Fora do escopo de código** (ops, não dev): "Integração com Chatwoot Account própria +
instância WhatsApp própria" citada na Fase 2 do task_plan requer criar conta/instância real
— tratado como passo de infraestrutura separado, não código.

Testado end-to-end no browser com tenant "Clínica Teste NexHub" (dentista) e paciente
"Paciente Dental": marcado dente 26 como Cariado (persistiu após reload) → anamnese salva
(alergia a Penicilina + diabetes, confirmado no banco) → orçamento "Restauracao dente 26"
R$350 criado e aprovado → tratamento criado vinculado a esse orçamento → evolução registrada.
Confirmado que tenant de nicho "unhas" (Salão Teste 2) não vê essas abas.

## Melhorias clínicas — anamnese/orçamento/evolução/convênio

Baseado em exploração do concorrente (Codental), com aprovação explícita do usuário (menos
consulta Serasa e IA, que ficam de fora). Migration `003_fase2_melhorias_clinicas.sql`
(clients.convenio, treatment_budgets.down_payment/installments/discount,
evolutions.professional, transactions.guia_number) rodada pelo usuário antes do código.

- **Odontograma**: redesenhado do zero em SVG anatômico (incisivo/canino/pré-molar/molar,
  coroa com cúspides + raiz única ou bifurcada conforme tipo), clique abre popover de status
  em vez do `<select>` antigo — resolve de raiz o bug visual de texto sobreposto (select de
  48px sem `overflow-hidden` deixava o texto vazar). Não copiei os assets do concorrente,
  desenhei os paths com base no que observei.
- **Anamnese**: expandida de 4 checkboxes pra 22 perguntas reais (Sim/Não/Não sei + campo
  livre condicional) + queixa principal, mesmo roteiro clínico do concorrente
  (`lib/anamnese-questions.ts`).
- **Orçamentos**: item agora pode vincular dente (FDI) + faces (mesial/distal/vestibular/
  lingual/oclusal); orçamento ganhou entrada, parcelas e desconto, com total recalculado no
  server (subtotal - desconto), nunca confiando no valor do client.
- **Evoluções**: editor rich text (negrito/itálico/sublinhado/lista) via contentEditable +
  execCommand, campo "profissional responsável" livre (sem tabela de profissionais ainda).
  **Bug real encontrado e corrigido durante o teste**: o editor reaplicava
  `dangerouslySetInnerHTML` a cada render (controlado pelo state do form), resetando o cursor
  pra posição 0 a cada tecla digitada — resultado: texto salvo invertido letra por letra.
  Corrigido tornando o conteúdo inicial fixo (`useState` sem re-sync), só resetado por
  remontagem via `key` após submit.
- **Convênio**: campo livre em `clients` (texto, "Particular" se vazio), exibido na ficha.
  **Guia**: campo `guia_number` em `transactions`, exibido na lista financeira — cobre o caso
  de convênios que exigem entrega de guia pro reembolso.

Testado end-to-end no browser: dente marcado no odontograma novo, anamnese com pressão alta
respondida, orçamento com dente 26 + face oclusal + entrada/parcelas/desconto calculando
certo, evolução com negrito e profissional salvando na ordem correta (após o fix do bug),
convênio "Bradesco Dental" na ficha, lançamento financeiro com número de guia. Tudo conferido
direto no banco também.

## Configuração de business_hours

`/configuracoes/horarios` — toggle ativo/inativo + início/fim por dia da semana, link a
partir da Agenda. `updateBusinessHoursAction` sobrescreve `tenants.business_hours` inteiro.

**Bug real encontrado e corrigido**: salvar não fazia nada — sem erro, sem persistir.
Causa raiz: a migration 001 só criou policy de **SELECT** em `tenants`, nunca de UPDATE.
Tenant nunca conseguiu editar a própria linha (nem `business_hours`, nem `theme_palette`, nem
nada) desde o início do projeto — RLS bloqueava silenciosamente (0 linhas afetadas, sem erro
reportado pelo supabase-js). Passou despercebido até agora porque nenhuma feature anterior
tentava fazer update direto de `tenants` pelo client autenticado (cadastro e admin sempre
usaram service role). Corrigido com `004_fix_tenants_update_policy.sql`
(`for update using (id = auth_tenant_id()) with check (id = auth_tenant_id())`, mesmo padrão
das outras tabelas). Rodado pelo usuário, retestado e confirmado no banco.

## Polish visual (passes 1-2)

Sem reescrever componente por componente: `globals.css` ganhou sombra sutil em cards
(`--shadow-sm`/`--shadow-md`), hover mais escuro em botões accent (`--accent-hover` via
`color-mix`, funciona nas 3 paletas sem hardcode), foco visível (outline accent) em todo
input/select/textarea/button/link. `AppNav` ganhou estado ativo (pill `bg-accent-soft`) +
sticky com blur. Financeiro, Clientes e Agenda redesenhados com ícones (lucide-react),
avatares com iniciais, badges, empty states. Passe iterativo, mais ajustes vêm conforme o
usuário for apontando.

## Fase 3 — Atendimento WhatsApp embutido (Chatwoot + Evolution)

Chatwoot e Evolution API já estavam instalados e configurados (infra própria do usuário,
`chat.nexhub.nexvix.com.br` / `evo.nexhub.nexvix.com.br`) — usando o número de teste do
IPTV do usuário (instância `playnex-iptv`) já que ainda não tem acesso ao WhatsApp da
dentista. Migration `005_fase3_atendimento_whatsapp.sql` adicionou credenciais por tenant em
`tenants` (chatwoot_base_url/api_token/inbox_id, evolution_base_url/api_key) — nunca expostas
ao client, só lidas em server actions.

- `src/lib/chatwoot.ts` — cliente HTTP puro (listConversations/listMessages/sendMessage),
  chamado só server-side.
- `src/app/actions/chat.ts` — server actions que buscam config do tenant logado e chamam a
  lib, retornando só o necessário pro client.
- `/atendimento` — interface própria (não embute Chatwoot via iframe, 100% nos tokens de cor
  do tenant): lista de conversas (avatar, nome, badge de não lida, preview) + thread de
  mensagens (bolhas incoming/outgoing) + campo de envio. Tempo real via polling (15s lista,
  4s mensagens da conversa aberta) — fallback simples do plano original, sem ActionCable.

**Cuidado de dados reais**: a instância de teste tem histórico real (556 contatos, ~6
conversas ativas na inbox) — usuário confirmou explicitamente que queria o histórico
completo carregado. Envio de mensagem de teste só foi feito na própria conversa do usuário
("Cauê") — nunca em conversas de clientes reais, por instrução explícita.

Testado end-to-end com dados reais: lista de conversas carregou (Patrícia Fleming, Cauê,
NilMoraes, etc.), thread de mensagens renderizou histórico real com bolhas corretas
(incoming cinza esquerda / outgoing accent direita), enviei "Teste NexHub CRM..." na conversa
do Cauê — confirmado que chegou (WhatsApp real via Evolution) e atualizou a lista.

**Não implementado ainda**: anexos/imagens nas mensagens (mostra bolha vazia se a mensagem só
tem attachment, sem renderizar a imagem), automações n8n (confirmação 24h antes, lembrete 2h
antes — ainda não construído).

### Pendente

Fase 1, Fase 2.5, Agenda, módulo Dentista, melhorias clínicas, `business_hours`, polish
visual e Fase 3 (atendimento WhatsApp) completos. Próximos: automações n8n, renderizar
anexos/imagens no chat, Fase 4 (módulo Salão de Unhas — ainda sem desenho, esperando piloto),
mais polish visual conforme apontado — ver task_plan6.md.

## Múltiplos profissionais — placeholder de UI (task_plan6.md)

Decisão explícita do plano: **não** implementar a tabela `professionals` ainda (schema já
desenhado no task_plan pra quando o gatilho — primeiro tenant multi-profissional real —
aparecer). Só a UI foi adiantada: `ProfessionalsBar` na Agenda mostra um chip com o nome do
tenant (placeholder, já que não existe campo de nome de usuário/profissional ainda) +
botão "+ Adicionar profissional" que mostra toast "Em breve" ao clicar, sem abrir formulário
funcional. Testado via JS no browser (toast aparece corretamente após o clique).

## Fase 3 — Automações de lembrete (n8n)

Arquitetura simples de propósito: n8n só faz cron + `POST` num endpoint do NexHub — toda a
lógica (quem lembrar, quando, o texto, marcar como enviado) fica no CRM, não espalhada em
nós do n8n. Migration `006_fase3_automacoes_lembretes.sql` (colunas
`reminder_24h_sent_at`/`reminder_2h_sent_at` em `appointments`, pra não duplicar disparo em
execuções repetidas do cron).

- `src/lib/evolution.ts` — `sendWhatsAppText` chama a Evolution API direto (não depende de já
  existir conversa no Chatwoot) + `normalizePhone` (assume DDI 55 quando falta).
- `POST /api/automations/reminders` (route handler, não server action — precisa ser
  chamável por HTTP externo) — protegido por header `x-api-key` (env `AUTOMATION_API_KEY`,
  gerado aleatório). Varre **todos os tenants** (service role, cruza RLS de propósito) nas
  janelas de 24h (23h30-24h30) e 2h (1h45-2h15) antes de cada consulta confirmada/pendente,
  monta a mensagem, manda, marca o `reminder_Xh_sent_at`. Aceita `?dryRun=1` pra testar sem
  enviar de verdade.

**Achado interessante ao testar**: mesmo mandando direto pela Evolution API (não pelo
Chatwoot), a mensagem apareceu automaticamente na thread do Chatwoot/`/atendimento` — a
integração Evolution↔Chatwoot sincroniza tudo que passa pela instância, não só o que se
origina no Chatwoot. Lembrete e conversa normal ficam unificados sem esforço extra.

Testado end-to-end: criei cliente+consulta de teste (telefone do Cauê, horário em +24h),
`dryRun=1` identificou certo, envio real funcionou (mensagem chegou no WhatsApp E na thread
do Chatwoot), reexecutar não duplicou (idempotência via `reminder_24h_sent_at`), 401 sem
`x-api-key`. Dados de teste limpos depois.

**Falta configurar do lado do n8n** (fora do meu alcance — preciso de acesso ao n8n do
usuário, ou instruções pra ele montar):
1. Node Cron, a cada 15 min.
2. Node HTTP Request: `POST {URL_DO_APP}/api/automations/reminders`, header
   `x-api-key: {AUTOMATION_API_KEY do .env.local}`.
3. ~~Só funciona com o app deployado~~ — **já deployado**, ver seção abaixo. Usar
   `https://nexhub-crm.vercel.app/api/automations/reminders` como URL do node HTTP Request.

## Deploy — GitHub + Vercel

- Repo: `https://github.com/caue-r-dev/nexhub-crm` (privado, conta `caue-r-dev`, via `gh repo
  create --source=. --push`).
- Vercel: projeto `nexhub-crm` no time `nexvixdev-3540s-projects` (sessão CLI já existia
  local, reaproveitada — mesmo padrão dos outros produtos Nexvix). GitHub conectado direto no
  `vercel link`, então todo push pra `master` gera deploy automático.
- Produção: **https://nexhub-crm.vercel.app**
- Env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `AUTOMATION_API_KEY`) configuradas via `vercel env add` nos 3
  ambientes (production/preview/development) — mesmos valores do `.env.local`.
- Testado em produção: `/login` responde 200, `/api/automations/reminders` responde 401 sem
  `x-api-key` (auth funcionando).
- `.env.local` ganhou `VERCEL_OIDC_TOKEN` automaticamente (`vercel link`) — token de sessão,
  não é segredo de longa duração, não precisa tratar como as outras chaves.

### Notas técnicas

- Next.js 16: `middleware.ts` foi renomeado pra `proxy.ts` (função `proxy`, não `middleware`).
  Ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Chaves Supabase usadas são do formato novo (`sb_publishable_...` / `sb_secret_...`), não JWT
  anon/service_role antigos — compatíveis com `@supabase/ssr` e `@supabase/supabase-js` 2.112.

## Agenda multi-profissional + Financeiro com gráficos (A1-A4)

- Migration `007_agenda_profissionais_pacotes_pix.sql`: `professionals`, `packages`,
  `appointments.professional_id`/`package_id`/`payment_status`/`deposit_amount`,
  `tenants.pix_key`/`pix_receiver_name`.
- Agenda redesenhada pro layout tipo Google Calendar (grade absoluta 30min, colunas por
  profissional), visão Dia (todos profissionais visíveis, chips de filtro) e Semana (1
  profissional via dropdown). Baseado em `agenda-prototype.jsx` fornecido, mas com popover de
  status reaproveitado do app (não existia no protótipo).
- CRUD de profissionais (`/agenda/profissionais/novo` e `/[id]/editar`): nome + cor
  pré-definida (8 opções), ativo/inativo.
- Campo profissional (opcional) no form de novo agendamento.
- Validado manualmente em browser: coluna aparece na hora certa, popover de status abre,
  troca de profissional na visão Semana funciona.
- Financeiro: gráfico de barras (Recharts) com receita mensal (recebido vs a receber) dos
  últimos 6 meses, logo abaixo dos cards de resumo.
  - **Bug pego e corrigido antes de reportar**: construir os buckets mensais com
    `Date.UTC(ano, mes, 1)` (meia-noite UTC) e formatar em `America/Sao_Paulo` joga a data pro
    mês anterior (UTC-3 rolls back pro dia 30/31 do mês passado). Fix: usar meio-dia UTC
    (`Date.UTC(ano, mes, 1, 12)`) pra evitar o rollback de fuso.

Pendente (não implementado ainda): A5 (pacotes/sessões) e A6 (Pix estático).

## A5 — Pacotes e sessões

- Tela de pacotes na ficha do cliente (`/clientes/[id]`): lista nome do serviço, sessões
  usadas/total, validade (com destaque se vencido). `+ Novo pacote` em
  `/clientes/[id]/pacotes/novo` (`PackageForm.tsx` + `createPackageAction`).
- Form de novo agendamento ganhou select "Usar pacote (opcional)", só aparece quando o
  cliente selecionado tem pacote com saldo (`used_sessions < total_sessions`).
- `updateAppointmentStatusAction`: ao marcar agendamento vinculado a pacote como `done`,
  incrementa `packages.used_sessions` em 1 — com guarda pra não incrementar duas vezes
  (só dispara se status anterior não era `done`).
- Escopo mínimo conforme spec: sem renovação automática, sem cobrança recorrente — só
  controle manual de saldo.
- Validado manualmente em browser: pacote criado (0/3) → agendamento vinculado → marcado
  Realizado → pacote foi pra 1/3.

Pendente: A6 (Pix estático).

## A6 — Pix antecipado no agendamento (QR estático, sem gateway)

- Libs: `pix-utils` (payload BR Code padrão Bacen) + `qrcode` (renderiza a imagem como
  data URL). Sem PSP/gateway, sem webhook — dinheiro cai direto na conta do tenant.
- `/configuracoes/pix`: tenant cadastra a própria chave Pix + nome do recebedor
  (`updatePixSettingsAction`, fallback do nome pro `tenants.name` se não preenchido).
- `/agenda/[id]/pix`: tela do agendamento com valor do sinal editável
  (`setDepositAmountAction` — seta `payment_status: 'aguardando'` na primeira vez), QR Code
  E o Pix Copia e Cola em texto com botão de copiar (`CopyBrCode.tsx`), e botão manual
  "Marcar como pago" (`markAppointmentPaidAction` → `payment_status: 'confirmado'`, sem
  confirmação automática — mesmo modelo operacional da Poliform).
- Popover de agendamento na Agenda ganhou link "Pix / sinal"; header da Agenda ganhou
  atalho "Pix" pra configuração da chave.
- Validado manualmente em browser: chave salva → QR gerado com valor R$80 → status virou
  "Aguardando pagamento" → "Marcar como pago" → status "Pago", botão some.

Com isso, A1-A6 do kickoff_agenda_profissionais_pacotes.md estão completos e validados.

## Identidade visual NexHub + reestruturação frontend (task_plan_nexhub_frontend.md)

- Favicon/ícones: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` (convenção
  automática do Next.js App Router) a partir de `nexhub-brand-package/favicons`.
- Cor de marca `#4338CA` (`--brand-primary`) e sidebar `#1E1B4B` (`--brand-sidebar-bg`)
  adicionadas em `globals.css` como fixas, **fora** do sistema `[data-palette]` — são o
  "chrome" da marca (sidebar, balão de mensagem enviada), não sobrescrevem o `--accent`
  de cada tenant (petroleo/bege/neutro) usado no conteúdo (botões, badges de profissional
  etc.), decisão confirmada com o usuário.
- Navbar horizontal (`AppNav.tsx`) substituída por `Sidebar.tsx`: fixa à esquerda,
  colapsa/expande com persistência em `localStorage`, logo `nexhub-icon.png`/
  `nexhub-wordmark.png` (copiados pra `public/brand/`).
  - **Bug pego e corrigido antes de reportar**: logo via `next/image` retornava 400 do
    otimizador (`/_next/image` → "isn't a valid image"), mesmo com PNG válido. Troquei
    pra `<img>` simples — logo estático pequeno não precisa de otimização, evita a
    dependência do pipeline de otimização do Next para esse caso.
- Início: de placeholder vazio pra dashboard-resumo (4 cards: agendamentos hoje, a
  receber na semana, pendências, novos clientes na semana + lista dos próximos
  agendamentos do dia).
- Clientes: ícones nos campos de contato da ficha (telefone/documento/nascimento/
  convênio) e espaçamento mais generoso na lista e nos cards.
- Financeiro: BarChart existente ganhou a cor de marca na barra "A receber"; novo
  `RevenueAreaChart` (Recharts `AreaChart`, gradiente `--brand-primary` esmaecendo)
  mostrando evolução de receita mês a mês, lado a lado com o BarChart.
- Agenda: `STATUS_BG` (único hex hardcoded do projeto) trocado por `color-mix()` a
  partir das CSS vars de status — sem mudar a lógica de cores por status. Comentário
  no `AppointmentBlock.tsx` sinalizando redesenho pendente do card (aguardando
  referência do Cauê).
- Atendimento: balão de mensagem enviada trocado de `bg-accent` pra `bg-brand` (cor de
  marca fixa) — baixo risco, só o balão, resto do redesenho aguarda referência.
- Validado manualmente em browser: sidebar colapsa/expande e persiste após reload,
  navegação em todas as 5 páginas sem quebrar layout, dashboard puxando dados reais,
  gráficos com cor de marca, ícones de contato, balão indigo.

Itens propositalmente não tocados (aguardando referência do Cauê): redesenho do card de
agendamento na Agenda, redesenho completo do Atendimento.

## Ajustes visuais pós-implementação (task_ajustes_visuais_nexhub.md)

- **Bug corrigido**: item ativo da sidebar usava `var(--brand-primary)` (índigo fixo do
  NexHub) em vez de `var(--accent)` (cor da paleta do tenant, já usada corretamente nos
  botões e blocos da Agenda). `Sidebar.tsx` agora lê `var(--accent)` pro indicador/fundo
  do item ativo — mesma fonte de cor que a Agenda já usava. `--brand-primary` continua
  definida no sistema (não removida), só parou de vazar pro item ativo da sidebar. Fundo
  da sidebar em si (`--brand-sidebar-bg`, índigo escuro) e o balão de mensagem enviada no
  Atendimento continuam usando a cor de marca fixa — eram decisões explícitas da task
  anterior, não o bug reportado aqui.
- **Densidade de layout**: container principal (`(dashboard)/layout.tsx`) de `max-w-5xl`
  pra `max-w-7xl`, deixando mais espaço horizontal disponível pro conteúdo de cada tela.
  - Início: cards de métrica maiores (padding, ícone e número com mais destaque).
  - Financeiro: mesmo tratamento nos 3 cards de resumo.
  - Agenda: colunas de profissional (visão Dia) e de dia (visão Semana) trocaram largura
    fixa por `flex-1` com `min-width` — poucos profissionais cadastrados fazem as colunas
    esticarem pra preencher a largura toda; muitos profissionais continuam gerando scroll
    horizontal normalmente (min-width preservado). Opção (a) do plano, sem tocar lógica de
    agendamento.
  - Clientes/Atendimento: só ajustes pontuais (busca um pouco mais larga); Atendimento já
    usava flexbox fluido, não precisou de mudança estrutural.
- Validado manualmente em browser com o tenant terracota (o mesmo do bug report): sidebar
  agora reflete a cor certa em todas as 5 páginas, colunas da Agenda preenchem a largura,
  cards do Início/Financeiro maiores. **Não validei com um segundo tenant de paleta
  diferente por falta de credenciais de login** — mas o mecanismo é o mesmo `var(--accent)`
  já comprovado funcionando nos botões/blocos da Agenda, então deve se comportar igual pra
  qualquer paleta.

## Correções pendentes + logout (task_correcoes_pendentes_nexhub.md)

- **Item 1 (faixa azul-marinho no rodapé)**: investigado a fundo — grep por hex próximos
  de `#132458`/`#1a1f5c` em todo `src/`, revisão de `html`/`body`/qualquer `footer` no
  CSS, teste em viewport grande (1440x900) e reload limpo do dev server. **Não encontrei
  nenhum elemento navy no código nem consegui reproduzir visualmente.** Suspeita forte: o
  círculo preto com "N" que o usuário mencionou como "avatar do usuário" (item 3) é na
  verdade o ícone flutuante da extensão Claude-in-Chrome no navegador, não faz parte do
  app — e a faixa azul pode ser a barra de tarefas do Windows (modo escuro) capturada
  junto no print, não algo renderizado pela página. Reportado ao usuário pra confirmar via
  DevTools em vez de eu adivinhar mais.
- **Item 2 (densidade ainda pequena)**: causa raiz real encontrada — **nada do trabalho
  de frontend das duas rodadas anteriores (sidebar, cores, dashboard, densidade) tinha
  sido commitado/deployado ainda**, só existia no working directory local. Se o usuário
  testou via algo diferente do dev server local (cache de build antigo, aba não
  recarregada), veria a versão antiga. Reconfirmei visualmente que os cards JÁ estavam
  grandes no dev server atual (screenshots tiradas após restart limpo do `next dev`) —
  código correto, sem mudança adicional necessária além de garantir que estava tudo
  rodando fresco.
- **Item 3 (logout)**: `src/app/actions/auth.ts` (`signOutAction`, Supabase
  `auth.signOut()` + `redirect('/login')`), botão "Sair" (`lucide-react` `LogOut`) no
  rodapé da sidebar, acima do botão de recolher. Testado ponta a ponta: clique → sessão
  encerrada → redireciona pra `/login` → login de novo funciona normal.
- **Commit + deploy**: todo o trabalho de frontend das últimas duas rodadas (que nunca
  tinha sido enviado) foi commitado e deployado agora — produção
  (`https://nexhub-crm.vercel.app`) atualizada.

## Cards com valores exatos + sidebar 100% na cor do tenant

- **Cards da Início** (`task_cards_valores_exatos.md`): valores literais aplicados —
  padding 32px, min-height 140px, ícone 56px, número 36px (text-4xl), label 16px
  (text-base), gap 24px entre cards. Medido via DevTools (`getBoundingClientRect` +
  `getComputedStyle`) após restart limpo do dev server: altura real 154px (vs. 104px
  antes), todos os valores batendo exatamente com o spec.
- **Sidebar 100% na cor do tenant** (`task_sidebar_cor_completa.md`): correção de rota
  anterior — fundo da sidebar inteira agora é `var(--accent)` (não mais `#1E1B4B` fixo).
  Texto/ícones usam novo token `--sidebar-text` (branco, declarado por paleta em
  `globals.css` — infraestrutura pronta pra paleta futura clara sobrescrever com texto
  escuro, sem cálculo de luminância em JS). Item ativo usa `var(--accent-hover)` (tom
  mais escuro do próprio accent) como destaque, não mais borda azul separada.
  `--brand-primary`/`--brand-sidebar-bg` mantidos no sistema como fallback documentado
  pra telas sem tenant, só pararam de vazar pra dentro do app autenticado.
  Confirmado via DevTools: `getComputedStyle(aside).backgroundColor` = `rgb(180, 83, 9)`
  (exatamente o accent da paleta terracota) em Início/Agenda/Financeiro/Atendimento.

## Automação de onboarding de WhatsApp por tenant (painel admin)

- Pesquisei a fundo antes de codar (conforme pedido): Chatwoot Platform API
  (accounts/users/account_users, token de super-admin via Platform App —
  precisa existir previamente, não tem UI, só Rails console) e Evolution API
  v2 (`/instance/create` com integração nativa `chatwoot*` + `autoCreate`
  criando o inbox sozinho, QR via `/instance/connect`, status via
  `/instance/connectionState`).
- **Bloqueio reportado antes de prosseguir**: não existia nenhuma credencial
  de nível plataforma no projeto (só as por-tenant já configuradas
  manualmente). Cauê forneceu `CHATWOOT_PLATFORM_TOKEN`, `CHATWOOT_BASE_URL`,
  `EVOLUTION_API_KEY`, `EVOLUTION_BASE_URL` como env vars **Sensitive** no
  Vercel (Preview/Production) — tive que readicionar em Development também
  pra rodar local (Sensitive não é legível de volta nem pelo CLI, só escrita
  única; valores vieram direto do Cauê no chat pra escrever local).
- **Fluxo implementado** (`src/lib/chatwoot-platform.ts`,
  `src/lib/evolution-admin.ts`, `src/app/api/tenants/[id]/connect-whatsapp/
  route.ts`): POST cria Account nova isolada no Chatwoot (Platform API), cria
  User com senha aleatória + `access_token`, linka como administrator na
  Account, cria instância Evolution já configurada com a integração Chatwoot
  nativa (`autoCreate`), busca o `inbox_id` criado automaticamente, salva tudo
  no tenant (`chatwoot_account_id`, `chatwoot_api_token`, `chatwoot_inbox_id`,
  `evolution_instance_name` etc.) e devolve só o QR Code pro client — token
  nunca sai do backend. GET no mesmo endpoint faz polling de
  `connectionState` + reemite QR fresco enquanto não conectar.
- Botão "Conectar WhatsApp" **só no painel admin** (`ConnectWhatsAppButton.tsx`
  na tela do tenant) — decisão deliberada de não expor no app do tenant, já
  que a operação usa credenciais de plataforma e cria recursos externos
  cobráveis; tenant comum não deveria poder disparar isso sozinho.
- **Bug pego e corrigido durante o teste real** (não só lido do código):
  1. Senha aleatória gerada só com base64url não passava na validação de
     senha do Chatwoot (exige caractere especial) — 422 na criação do user.
     Corrigido acrescentando um sufixo fixo com especial.
  2. `/instance/create` nem sempre devolve o QR inline (veio `null` no teste
     real) — adicionado fallback pra `/instance/connect` quando isso
     acontece, tanto na criação quanto no polling.
- **Testado de ponta a ponta com tenant real** ("Salão Teste 2", sem
  WhatsApp configurado) rodando a mesma lógica da rota via script: Account
  isolada criada (confirmei que é uma Account **nova**, não reaproveitou a
  Account 1 do playnex-iptv), User linkado, instância Evolution criada com
  chatwoot apontando certo, inbox auto-criado encontrado e salvo, QR real
  gerado e válido (13KB, `data:image/png;base64,...`). Dados de teste
  limpos depois (Account/instância deletadas, tenant resetado pra null) —
  fica pronto pra você testar o fluxo real pela UI do painel admin.
- **O que eu não consigo validar sozinho**: escanear o QR com um celular
  real e confirmar que mensagem enviada pela interface chega no WhatsApp —
  isso só você pode fazer. O botão está em
  `/admin/tenants/ac4c0547-a3fc-4845-accd-02fc9f85111c` (tenant "Salão Teste
  2", limpo e pronto) ou qualquer outro tenant sem `chatwoot_account_id`.

## Conectar WhatsApp movido pro app do tenant (correção de escopo)

- Feedback do Cauê: quem deve clicar "Conectar WhatsApp" é o próprio cliente
  (dono do WhatsApp que vai escanear), não o admin. Movido o botão do painel
  admin pra tela de Atendimento (aparece junto da mensagem "não configurado
  pra esse tenant").
- `src/app/api/tenants/[id]/connect-whatsapp/route.ts`: autorização trocada
  de "só admin" pra "admin OU o próprio tenant dono do id" (`getCurrentTenant()`
  comparado com o `:id` da rota) — continua impossível um tenant conectar
  WhatsApp de outro.
- Painel admin agora só mostra status somente-leitura ("Conectado" /
  "Não conectado — o próprio cliente conecta na aba Atendimento").
- Componente movido de `components/admin` pra `components/atendimento`.
- **Testado de ponta a ponta pela UI real** logado como tenant sem WhatsApp
  (resetei senha de um usuário de teste pra conseguir logar): clique em
  "Conectar WhatsApp" na aba Atendimento → QR real apareceu na tela em ~3s.
  Limpo depois (Account/instância deletadas, tenant resetado).

## Bug crítico corrigido: polling matava a conexão do WhatsApp

- Sintoma reportado: conectou o WhatsApp, mandou mensagem de teste, nada
  chegou no painel, nenhuma conversa importada.
- **Causa raiz**: o polling de status (`GET /connect-whatsapp` a cada 4s)
  chamava `/instance/connect` a cada tick pra "atualizar" o QR — isso pede
  um QR novo ao WhatsApp/Baileys repetidamente. O WhatsApp tem limite de
  regeneração de QR; estourar esse limite trava a sessão de vez. Confirmei
  isso direto no Chatwoot: a conversa criada tinha só uma mensagem do bot
  ("🚨 QRCode generation limit reached, to generate a new QRCode, send the
  'init' message again"), nunca conectou de verdade.
- **Fix**: `GET` só checa `connectionState` (leve, não gera QR) por padrão.
  QR só é regerado sob pedido explícito (`?refreshQr=1`, botão "Gerar novo
  QR" na UI) — nunca automático no polling. Polling subiu de 4s pra 5s.
- Limpo os dois tenants afetados (residual do meu teste + do teste real do
  Cauê) — Account/instância deletadas, campos resetados pra null, prontos
  pra reconectar do zero com o código corrigido.

## Segundo bug crítico: inbox nunca era criado no Chatwoot (autoCreate no campo errado)

- Sintoma: WhatsApp conectava (status "open"), mas mensagem de teste não
  aparecia no painel — 0 conversas, 0 inboxes na Account do Chatwoot.
- **Causa raiz**: `chatwootAutoCreate` só existe no endpoint
  `POST /chatwoot/set/{instance}` (nomes sem prefixo `chatwoot`) — no
  `POST /instance/create` esse campo é **ignorado silenciosamente**. Mandava
  `chatwootAutoCreate: true` no create e a Evolution nunca criava o inbox,
  mesmo com a integração aparecendo `"enabled": true`.
- Confirmei ao vivo: reenviando a config via `/chatwoot/set/{instance}` com
  `autoCreate: true` no campo certo, o inbox apareceu na hora.
- **Fix**: `createInstanceWithChatwoot` agora faz as duas chamadas — cria a
  instância e, na sequência, `/chatwoot/set/{instance}` com os nomes de
  campo corretos garantindo o `autoCreate`.
- Reparei na hora o tenant que já estava conectado (Salão Teste 2, account
  8) — achei o inbox criado manualmente durante o diagnóstico e salvei o
  `chatwoot_inbox_id` certo, sem precisar desconectar/reconectar o WhatsApp
  dele de novo.

## Import de histórico do WhatsApp habilitado

- `chatwootImportContacts`/`chatwootImportMessages` estavam `false` — nenhum
  histórico de conversa entrava, só mensagens novas dali pra frente.
- Ligado nos dois pontos (`/instance/create` e `/chatwoot/set`), com
  `daysLimitImportMessages: 9999` (carregar tudo, igual decisão já tomada
  antes no fluxo manual do playnex-iptv).
- Import histórico só dispara na abertura da conexão/sync inicial — pra
  tenants que já estavam conectados sem essa flag, precisei reenviar a
  config via `/chatwoot/set` + `POST /instance/restart/{instance}` pra
  forçar um novo sync. Testado ao vivo no tenant "Salão Teste 2": 3
  conversas antigas importadas depois do restart.
- Tenants que conectarem **de agora em diante** (fluxo normal, sem precisar
  desse passo manual) já importam o histórico automaticamente na primeira
  conexão.
