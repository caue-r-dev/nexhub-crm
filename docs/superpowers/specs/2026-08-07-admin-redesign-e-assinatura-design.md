# Redesign painel admin + assinatura self-service (PIX) + gerar teste

## Contexto

Painel admin (`/admin/*`) hoje é visual cru (sem logo, sem paleta). O botão de
renovação de assinatura (`markPaidAction`) já existe mas é escondido dentro de
`/admin/tenants/[id]`. Não existe forma rápida de criar um tenant de teste pra
um lead — hoje só via `/cadastro`, que exige senha e nome do negócio na hora.
Cliente pagante também não vê em lugar nenhum quando a assinatura vence, nem
tem como renovar sozinho.

Este spec cobre três fases sequenciais, implementadas nessa ordem.

## Fase A — Redesign visual do painel admin

**Escopo:** `/admin/login`, `/admin` (dashboard/lista de tenants),
`/admin/tenants/[id]`.

- Logo: `public/brand/nexhub-icon-petroleo.png` + wordmark "NexHub", mesmo
  padrão já usado no login de tenant (`src/components/login/LoginForm.tsx`).
- Paleta: verde-petróleo `#0F6E56` como cor de destaque (mesma constante
  `VERDE` usada no login), substituindo o `bg-accent`/`text-accent` genérico
  atual nessas três telas.
- Botão "Marcar como pago" (`TenantAdminForm.tsx`) ganha destaque visual
  maior (cor cheia, mais proeminente que os outros botões da linha) — sem
  mudar a lógica (`markPaidAction` continua igual: avança `next_due_date` em
  1 mês a partir de hoje ou do vencimento anterior, o que for maior, e ativa).
- Sem mudança de estrutura/rotas, só CSS e composição visual.

## Fase B — Widget de assinatura no dashboard do cliente

**Onde:** `src/components/Sidebar.tsx` (visível em toda página do
dashboard de tenant).

**O que mostra**, lendo campos que já existem em `tenants` (nenhuma migration
nova nesta fase):

- `subscription_status = 'trial'` → badge "Teste expira em Xd" (calculado a
  partir de `trial_ends_at`, mesma função `daysUntil` já usada no admin).
- `subscription_status = 'active'` → badge "Vence em Xd" (a partir de
  `next_due_date`) + botão **Renovar**.
- `subscription_status` em `overdue`/`cancelled` → badge de aviso, sem
  bloquear acesso (fora de escopo mudar isso agora).

**Fluxo de renovação:**

1. Cliente clica "Renovar" → modal abre com QR code PIX.
2. QR gerado via `generatePixQr()` (`src/lib/pix.ts`, já existe — usado hoje
   pro PIX de agendamento) com:
   - `pixKey` / `receiverName`: vêm de env vars novas (`ADMIN_PIX_KEY`,
     `ADMIN_PIX_RECEIVER_NAME`) — é você (dono do SaaS) recebendo, não o
     tenant. Diferente do `tenants.pix_key` que já existe (esse é a chave do
     *tenant* pros clientes *dele*).
   - `amount`: `tenants.monthly_price` do tenant logado.
   - `txid`: `tenant.id` truncado (mesmo padrão do PIX de agendamento).
3. Cliente paga fora do sistema (não tem webhook, confirmado com o Cauê).
4. Você confere o extrato e clica "Marcar como pago" no painel admin
   (`/admin/tenants/[id]`, botão da Fase A) — mesma action que já existe.

**Server action nova:** `generateSubscriptionPixAction(tenantId)` em
`src/app/actions/` (tenant-side, usa `createClient` normal — RLS já garante
que só vê o próprio tenant), retorna `{ qrImage, brCode }` ou `{ error }`.

## Fase C — Botão "Gerar teste" + onboarding do lead

**Migration nova** (`009_tenant_onboarding.sql`):

```sql
alter table tenants add column onboarding_completed boolean not null default true;
```

Default `true` pra não afetar tenants já existentes (todos já passaram por
`/cadastro`, que já pede nicho/paleta/nome). Só tenants criados pelo fluxo
novo nascem com `false`.

**Admin: botão "Gerar teste"** — novo, no dashboard `/admin` (topo, ao lado
do título "Tenants").

- Abre um form simples: um campo, email do lead.
- Nova server action `generateTrialTenantAction(email)` em
  `admin-tenants.ts`:
  1. `admin.auth.admin.createUser({ email, password: <temp gerada>,
     email_confirm: true })` — mesmo gerador de senha temporária de
     `generateTempPasswordAction`.
  2. Cria `tenants` com placeholders: `name: 'Novo tenant'`,
     `niche_id: <primeiro niche ativo, ordenado por sort_order>`,
     `theme_palette: 'petroleo'`, `subscription_status: 'trial'`,
     `trial_ends_at: hoje + 7 dias`, `onboarding_completed: false`.
  3. Cria linha em `users` (`tenant_id`, `auth_id`, `email`, `role: 'owner'`).
  4. Retorna `{ tempPassword, email }` — mostra uma vez na tela, mesmo padrão
     visual do `TenantUsersPanel` (Fase A já deixa esse componente com a cara
     nova).
  5. Erro em qualquer etapa desfaz o que já foi criado (mesmo padrão de
     rollback do `cadastroAction`).
- Trial de 7 dias é o padrão — sem campo pra admin escolher isso agora (YAGNI,
  já dá pra editar depois em `/admin/tenants/[id]`, campo "Trial termina em"
  que já existe).

**Cliente: tela `/onboarding`**

- Proxy (`src/proxy.ts`) ganha uma checagem: usuário autenticado, rota não é
  `/onboarding` nem pública, tenant do usuário tem `onboarding_completed =
  false` → redireciona pra `/onboarding`. (Precisa de uma query extra no
  proxy — busca `users.tenant_id` → `tenants.onboarding_completed` pelo
  `auth_id` da sessão.)
- Se já em `/onboarding` e `onboarding_completed = true` → redireciona pra
  `/` (evita acesso solto depois de configurado).
- Página pede: nome do negócio, nicho (dropdown com os niches ativos),
  paleta (as 3 opções existentes: petroleo/bege/neutro) — mesmos campos e
  mesmo componente de escolha que `/cadastro` já usa hoje, reaproveitado.
- Nova server action `completeOnboardingAction(input)`: `update tenants set
  name, niche_id, theme_palette, onboarding_completed = true where id =
  <tenant do usuário logado>`. Depois `redirect('/')`.

## Fora de escopo (explícito)

- Webhook de confirmação de PIX automática — pagamento continua confirmado
  manual por você.
- Bloquear acesso do tenant quando `overdue`/`cancelled` — hoje não bloqueia,
  este spec não muda isso.
- Editar `ADMIN_PIX_KEY` pela UI — fica em env var (Vercel), só você mexe.
- Múltiplos admins com chaves PIX diferentes — só existe um admin hoje.

## Testes manuais (sem suite automatizada no projeto)

- Fase A: visual em `/admin/login`, `/admin`, `/admin/tenants/[id]` —
  conferir contraste/paleta nos dois temas se aplicável.
- Fase B: tenant trial vê badge de dias restantes; tenant ativo vê "Vence em
  Xd" + botão Renovar; QR gerado abre e tem valor/chave corretos; depois de
  "Marcar como pago" no admin, badge do cliente atualiza pro novo
  `next_due_date`.
- Fase C: gerar teste com email real → login com senha temporária cai em
  `/onboarding` → preenche → cai no dashboard normal → `onboarding_completed`
  vira `true` no banco → acessar `/onboarding` de novo redireciona pra `/`.
