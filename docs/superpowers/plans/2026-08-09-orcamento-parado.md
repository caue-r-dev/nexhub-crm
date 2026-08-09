# Recuperação automática de orçamento parado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orçamento sem aprovar/recusar por 3 dias recebe WhatsApp automático perguntando se pode ajudar a agendar; se ainda parado no dia 7, recebe um segundo toque. Para sozinho quando o orçamento é aprovado ou recusado.

**Architecture:** Duas colunas de controle em `treatment_budgets` (`declined_at`, `followup_day3_sent_at`, `followup_day7_sent_at`) mais um endpoint de cron novo (`/api/automations/budget-followup`) que segue o mesmo padrão de `/api/automations/reminders` (service role, header `x-api-key`, chamado pelo n8n) — mas com granularidade de dia (roda 1x/dia) em vez de a cada 15min. Mensagem customizável por tenant, mesmo padrão de `reminder_message_24h`.

**Tech Stack:** Next.js 16 (App Router, server actions + route handlers), Supabase (Postgres + RLS, service role pro cron), TypeScript, Tailwind.

## Global Constraints

- Migrations SQL são arquivos numerados na raiz do repo, aplicados manualmente via Supabase Dashboard > SQL Editor — sem CLI de migration.
- `src/lib/supabase/types.ts` é mantido manualmente, sem geração automática — toda migration precisa de update correspondente nesse arquivo.
- Rotas de automação (`/api/automations/*`) usam sempre `createAdminClient()` (service role) e autenticação via header `x-api-key` comparado a `process.env.AUTOMATION_API_KEY` — padrão já usado em `/api/automations/reminders` e `/api/automations/expire-bookings`.
- Sem harness de teste pra API routes neste projeto (decisão de escopo já estabelecida na feature anterior) — não criar testes pras rotas desta plan.
- Spec de referência: `docs/superpowers/specs/2026-08-09-orcamento-parado-design.md`.

---

## Task 1: Migration de schema

**Files:**
- Create: `012_orcamento_parado.sql`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `treatment_budgets.declined_at`, `treatment_budgets.followup_day3_sent_at`, `treatment_budgets.followup_day7_sent_at`, `tenants.budget_followup_message_day3`, `tenants.budget_followup_message_day7`.

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- ============================================================
-- FASE: recuperação automática de orçamento parado
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

alter table treatment_budgets add column declined_at timestamptz;
alter table treatment_budgets add column followup_day3_sent_at timestamptz;
alter table treatment_budgets add column followup_day7_sent_at timestamptz;

alter table tenants add column budget_followup_message_day3 text;
alter table tenants add column budget_followup_message_day7 text;
```

- [ ] **Step 2: Aplicar manualmente no Supabase Dashboard > SQL Editor.** Confirmar sem erro.

- [ ] **Step 3: Atualizar `src/lib/supabase/types.ts`**

No bloco `tenants` (por volta da linha 90), Row — adicionar depois de `reminder_message_2h: string | null`:

```ts
          reminder_message_2h: string | null
          budget_followup_message_day3: string | null
          budget_followup_message_day7: string | null
```

Insert (por volta da linha 121), mesmo ponto:

```ts
          reminder_message_2h?: string | null
          budget_followup_message_day3?: string | null
          budget_followup_message_day7?: string | null
```

No bloco `treatment_budgets` (por volta da linha 417), Row — adicionar depois de `discount: number`:

```ts
          discount: number
          declined_at: string | null
          followup_day3_sent_at: string | null
          followup_day7_sent_at: string | null
```

Insert (por volta da linha 438), mesmo ponto:

```ts
          discount?: number
          declined_at?: string | null
          followup_day3_sent_at?: string | null
          followup_day7_sent_at?: string | null
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add 012_orcamento_parado.sql src/lib/supabase/types.ts
git commit -m "feat: schema pra recuperacao automatica de orcamento parado"
```

---

## Task 2: Marcar orçamento como recusado (UI)

**Files:**
- Modify: `src/app/actions/treatment-budgets.ts`
- Create: `src/components/orcamentos/DeclineBudgetButton.tsx`
- Modify: `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx`

**Interfaces:**
- Produces: `declineBudgetAction(id, clientId)` — usado pelo componente novo.
- Consumes: nenhuma interface de outra task desta plan.

- [ ] **Step 1: Adicionar a server action**

Em `src/app/actions/treatment-budgets.ts`, adicionar ao final do arquivo (mesmo padrão de `approveBudgetAction`):

```ts
export async function declineBudgetAction(id: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('treatment_budgets')
    .update({ declined_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/clientes/${clientId}/orcamentos`)
}
```

- [ ] **Step 2: Criar o botão**

`src/components/orcamentos/DeclineBudgetButton.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { declineBudgetAction } from '@/app/actions/treatment-budgets'

export function DeclineBudgetButton({ id, clientId }: { id: string; clientId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await declineBudgetAction(id, clientId) })}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary disabled:opacity-40"
    >
      {isPending ? 'Marcando...' : 'Marcar como recusado'}
    </button>
  )
}
```

- [ ] **Step 3: Plugar na tela de orçamentos**

Em `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx`, importar o novo componente:

```ts
import { DeclineBudgetButton } from '@/components/orcamentos/DeclineBudgetButton'
```

Trocar o bloco (atualmente):

```tsx
                {b.approved_at ? (
                  <span className="text-sm font-medium text-status-confirmed">Aprovado</span>
                ) : (
                  <ApproveBudgetButton id={b.id} clientId={id} />
                )}
```

Por:

```tsx
                {b.approved_at ? (
                  <span className="text-sm font-medium text-status-confirmed">Aprovado</span>
                ) : b.declined_at ? (
                  <span className="text-sm font-medium text-status-cancelled">Recusado</span>
                ) : (
                  <div className="flex gap-2">
                    <ApproveBudgetButton id={b.id} clientId={id} />
                    <DeclineBudgetButton id={b.id} clientId={id} />
                  </div>
                )}
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/treatment-budgets.ts src/components/orcamentos/DeclineBudgetButton.tsx "src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx"
git commit -m "feat: marcar orcamento como recusado"
```

---

## Task 3: Configuração de mensagem de orçamento parado

**Files:**
- Create: `src/app/actions/budget-followup-settings.ts`
- Create: `src/components/configuracoes/BudgetFollowupSettingsForm.tsx`
- Modify: `src/app/(dashboard)/configuracoes/lembretes/page.tsx`

**Interfaces:**
- Produces: `tenants.budget_followup_message_day3`/`day7` preenchidos — consumidos pela Task 4 (cron).
- Consumes: `getCurrentTenant()`, `createClient()` (mesmo padrão de `reminder-settings.ts`).

- [ ] **Step 1: Server action**

`src/app/actions/budget-followup-settings.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateBudgetFollowupSettingsAction(input: { messageDay3: string; messageDay7: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      budget_followup_message_day3: input.messageDay3.trim() || null,
      budget_followup_message_day7: input.messageDay7.trim() || null,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes/lembretes')
}
```

- [ ] **Step 2: Componente de formulário**

`src/components/configuracoes/BudgetFollowupSettingsForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateBudgetFollowupSettingsAction } from '@/app/actions/budget-followup-settings'

const DEFAULT_DAY3 =
  'Olá {{nome}}! Vi que seu orçamento de {{valor}} na {{clinica}} ainda tá em aberto. Posso te ajudar a agendar?'
const DEFAULT_DAY7 =
  'Olá {{nome}}! Seu orçamento de {{valor}} na {{clinica}} continua disponível. Quer que eu já deixe seu horário marcado?'

function preview(template: string) {
  return template
    .replace(/{{\s*nome\s*}}/g, 'Maria')
    .replace(/{{\s*valor\s*}}/g, 'R$ 350,00')
    .replace(/{{\s*clinica\s*}}/g, 'Clínica Exemplo')
}

export function BudgetFollowupSettingsForm({
  initialMessageDay3,
  initialMessageDay7,
}: {
  initialMessageDay3: string
  initialMessageDay7: string
}) {
  const [messageDay3, setMessageDay3] = useState(initialMessageDay3 || DEFAULT_DAY3)
  const [messageDay7, setMessageDay7] = useState(initialMessageDay7 || DEFAULT_DAY7)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateBudgetFollowupSettingsAction({ messageDay3, messageDay7 })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <p className="text-sm text-text-secondary">
        Placeholders disponíveis: <code className="text-text">{'{{nome}}'}</code>{' '}
        <code className="text-text">{'{{valor}}'}</code> <code className="text-text">{'{{clinica}}'}</code>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Orçamento parado há 3 dias</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={messageDay3}
          onChange={(e) => {
            setMessageDay3(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(messageDay3)}</p>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Orçamento parado há 7 dias</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={messageDay7}
          onChange={(e) => {
            setMessageDay7(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(messageDay7)}</p>
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Plugar na página de lembretes**

Substituir o conteúdo de `src/app/(dashboard)/configuracoes/lembretes/page.tsx` por:

```tsx
import { getCurrentTenant } from '@/lib/tenant'
import { ReminderSettingsForm } from '@/components/configuracoes/ReminderSettingsForm'
import { BudgetFollowupSettingsForm } from '@/components/configuracoes/BudgetFollowupSettingsForm'

export default async function LembretesConfigPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Mensagens de lembrete</h1>
          <p className="text-text-secondary">
            Texto enviado automaticamente por WhatsApp 24h e 2h antes de cada consulta. Deixe em
            branco pra usar o texto padrão.
          </p>
        </div>
        {tenant && (
          <ReminderSettingsForm
            initialMessage24h={tenant.reminder_message_24h ?? ''}
            initialMessage2h={tenant.reminder_message_2h ?? ''}
          />
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-text">Orçamento parado</h2>
          <p className="text-text-secondary">
            Texto enviado automaticamente quando um orçamento fica sem aprovar nem recusar por 3 e
            depois 7 dias. Deixe em branco pra usar o texto padrão.
          </p>
        </div>
        {tenant && (
          <BudgetFollowupSettingsForm
            initialMessageDay3={tenant.budget_followup_message_day3 ?? ''}
            initialMessageDay7={tenant.budget_followup_message_day7 ?? ''}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/budget-followup-settings.ts src/components/configuracoes/BudgetFollowupSettingsForm.tsx "src/app/(dashboard)/configuracoes/lembretes/page.tsx"
git commit -m "feat: config de mensagem de orcamento parado"
```

---

## Task 4: Cron de recuperação de orçamento parado

**Files:**
- Create: `src/app/api/automations/budget-followup/route.ts`

**Interfaces:**
- Consumes: `sendWhatsAppText` (`src/lib/evolution.ts`), `createAdminClient` (`src/lib/supabase/admin.ts`).
- Produces: `POST /api/automations/budget-followup` (chamado por n8n 1x por dia).

- [ ] **Step 1: Implementar a rota**

```ts
// Chamado pelo n8n (cron 1x por dia, diferente do lembrete de consulta que roda
// a cada ~15min — recuperação de orçamento trabalha em granularidade de dia) —
// nunca pelo frontend. Varre todos os tenants (service role, ignora RLS de
// propósito) procurando orçamentos sem aprovar/recusar há 3 ou 7 dias, manda
// WhatsApp e marca o envio pra não duplicar na próxima execução. Um orçamento
// que vira aprovado ou recusado simplesmente some da consulta (filtro
// approved_at/declined_at is null) — não precisa de lógica extra pra "parar".
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

const DEFAULT_DAY3 =
  'Olá {{nome}}! Vi que seu orçamento de {{valor}} na {{clinica}} ainda tá em aberto. Posso te ajudar a agendar?'
const DEFAULT_DAY7 =
  'Olá {{nome}}! Seu orçamento de {{valor}} na {{clinica}} continua disponível. Quer que eu já deixe seu horário marcado?'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function applyTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) => vars[key] ?? match)
}

function daysSince(iso: string): number {
  const created = new Date(iso).getTime()
  const now = Date.now()
  return Math.floor((now - created) / (24 * 3600_000))
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dryRun') === '1'

  const admin = createAdminClient()

  const { data: budgets, error } = await admin
    .from('treatment_budgets')
    .select(
      'id, total, created_at, followup_day3_sent_at, followup_day7_sent_at, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name, budget_followup_message_day3, budget_followup_message_day7)'
    )
    .is('approved_at', null)
    .is('declined_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { budgetId: string; window: '3d' | '7d'; client: string; sent: boolean; error?: string }[] = []

  for (const budget of budgets ?? []) {
    const client = budget.clients as unknown as { name: string; phone: string | null } | null
    const tenant = budget.tenants as unknown as {
      name: string
      evolution_base_url: string | null
      evolution_api_key: string | null
      evolution_instance_name: string | null
      budget_followup_message_day3: string | null
      budget_followup_message_day7: string | null
    } | null

    const age = daysSince(budget.created_at)

    let window: '3d' | '7d' | null = null
    if (age >= 3 && !budget.followup_day3_sent_at) {
      window = '3d'
    } else if (age >= 7 && !budget.followup_day7_sent_at) {
      window = '7d'
    }

    if (!window) continue

    if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
      results.push({
        budgetId: budget.id,
        window,
        client: client?.name ?? '—',
        sent: false,
        error: 'Sem telefone ou WhatsApp não configurado pro tenant.',
      })
      continue
    }

    const customTemplate = window === '3d' ? tenant.budget_followup_message_day3 : tenant.budget_followup_message_day7
    const defaultTemplate = window === '3d' ? DEFAULT_DAY3 : DEFAULT_DAY7
    const template = customTemplate?.trim() || defaultTemplate
    const message = applyTemplate(template, {
      nome: client.name.split(' ')[0],
      valor: formatBRL(budget.total),
      clinica: tenant.name,
    })

    if (dryRun) {
      results.push({ budgetId: budget.id, window, client: client.name, sent: false, error: 'dry-run' })
      continue
    }

    try {
      await sendWhatsAppText(
        {
          baseUrl: tenant.evolution_base_url,
          apiKey: tenant.evolution_api_key,
          instanceName: tenant.evolution_instance_name,
        },
        client.phone,
        message
      )
      const sentAtPatch =
        window === '3d' ? { followup_day3_sent_at: new Date().toISOString() } : { followup_day7_sent_at: new Date().toISOString() }
      await admin.from('treatment_budgets').update(sentAtPatch).eq('id', budget.id)
      results.push({ budgetId: budget.id, window, client: client.name, sent: true })
    } catch (e) {
      results.push({
        budgetId: budget.id,
        window,
        client: client.name,
        sent: false,
        error: e instanceof Error ? e.message : 'Erro desconhecido.',
      })
    }
  }

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/automations/budget-followup/route.ts
git commit -m "feat: cron de recuperacao de orcamento parado"
```

---

## Task 5: Configurar n8n pro novo cron

**Files:**
- Nenhum arquivo do repo (configuração externa no n8n).

**Interfaces:**
- Consumes: `POST /api/automations/budget-followup` (Task 4).

- [ ] **Step 1: Duplicar o workflow "Expire bookings" (ou o de lembretes) no n8n, apontando pra `/api/automations/budget-followup`, mesmo header `x-api-key`.**

- [ ] **Step 2: Trocar o Schedule Trigger pra rodar 1x por dia (ex: todo dia às 09:00 — horário comercial, evita mandar WhatsApp de madrugada) em vez de a cada 15min.**

- [ ] **Step 3: Rodar manualmente uma vez no n8n e conferir retorno 200 com `results: []` (ou com envios, se houver orçamento parado de teste).**

Sem commit — task de configuração de infra fora do repo.

---

## Self-Review

**Cobertura da spec:** botão de recusar (Task 2), cron dia 3 e dia 7 com template customizável (Task 3 + 4), para automaticamente quando aprovado/recusado — via filtro `is('approved_at', null).is('declined_at', null)` na query do cron (Task 4), sem estado extra necessário. n8n 1x/dia (Task 5).

**Placeholders:** nenhum TBD/TODO restante.

**Consistência de tipos:** campos `declined_at`/`followup_day3_sent_at`/`followup_day7_sent_at` (Task 1) usados com os mesmos nomes em Task 2 (`declineBudgetAction`) e Task 4 (query + update do cron). `budget_followup_message_day3`/`day7` (Task 1) usados em Task 3 (form) e Task 4 (cron), mesmos nomes.
