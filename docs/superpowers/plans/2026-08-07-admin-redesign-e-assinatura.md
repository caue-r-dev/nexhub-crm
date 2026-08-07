# Redesign painel admin + assinatura self-service (PIX) + gerar teste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar cara de marca ao painel admin (logo + paleta petróleo), mostrar
pro cliente quando a assinatura/trial vence com botão de renovação via PIX, e
dar ao admin um jeito de criar um tenant de teste só com o email do lead.

**Architecture:** Next.js 16 App Router, Supabase (Postgres + Auth + RLS).
Server actions para toda mutação. Paleta e cor de destaque já são
data-driven via `data-palette` no `<html>` + CSS vars (`globals.css`) — o
painel admin hoje força `data-palette="neutro"`, então trocar pra
`"petroleo"` já recolore todo botão/link que usa as classes `bg-accent` /
`text-accent` existentes, sem precisar hardcodar cor em cada componente.

**Tech Stack:** Next.js 16 (Turbopack), TypeScript, Supabase (`@supabase/ssr`,
`@supabase/supabase-js`), Tailwind v4, `pix-utils` + `qrcode` (já instalados).

## Global Constraints

- Projeto não tem suite de testes automatizada. Verificação de cada task é:
  `npx tsc --noEmit` (zero erros), `npx eslint <arquivos tocados>` (zero
  erros/warnings), e um passo manual no browser descrito na task.
- Sempre criar arquivos novos com aspas simples, sem ponto-e-vírgula
  desnecessário, seguindo o estilo já usado no repo (ver qualquer arquivo em
  `src/components`).
- Cores/paleta: nunca hardcodar hex em componente novo — usar classes
  `bg-accent`/`text-accent`/`text-text`/`text-text-secondary`/`border-border`
  (tokens já mapeados em `globals.css`) exceto nas telas de login (que já
  usam a constante `VERDE = '#0F6E56'` hardcoded, padrão existente, manter).
- Logo: `nexhub-icon.png`/`nexhub-wordmark.png` (brancos) fora da tela de
  login; `nexhub-icon-petroleo.png` só nas telas de login (tenant e admin).
- Migration SQL: criar o arquivo `.sql` na raiz do projeto seguindo o padrão
  numérico existente (`00N_descricao.sql`), mas **não faz parte do CI/deploy
  automático** — precisa ser rodada manualmente no SQL Editor do Supabase
  Dashboard (mesmo padrão de todas as migrations anteriores do projeto).

---

## Task 1: Painel admin usa paleta petróleo + logo branca no header

**Files:**
- Modify: `src/app/admin/(panel)/layout.tsx`
- Modify: `src/components/admin/TenantAdminForm.tsx:56-77` (ícone no botão de renovação)

**Interfaces:**
- Consumes: `getCurrentAdmin()` (já existe, `src/lib/admin.ts`), `signOutAction` não é usado aqui (painel admin não tem, mantém como está).
- Produces: nenhuma interface nova — só JSX/classes.

- [ ] **Step 1: Trocar `data-palette` e redesenhar o header do painel admin**

Ler o arquivo atual primeiro pra confirmar que não mudou desde o brainstorm:

```bash
cat "src/app/admin/(panel)/layout.tsx"
```

Substituir o conteúdo inteiro por:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentAdmin } from '@/lib/admin'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="flex min-h-screen flex-col" data-palette="petroleo">
      <header className="bg-accent">
        <nav className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/nexhub-icon.png" alt="" width={28} height={28} />
            <span className="font-semibold text-white">Painel Admin</span>
          </Link>
          <span className="ml-auto text-sm text-white/80">{admin.email}</span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
```

Nota: `data-palette="petroleo"` no wrapper de fora vale pra tudo dentro
(header e `<main>`) — não tem `data-palette` no `<main>` sobrescrevendo, é
herdado. Isso já deixa qualquer `bg-accent`/`text-accent` existente no
painel (ex: o botão de renovação abaixo) verde-petróleo automaticamente, sem
precisar hardcodar hex em componente nenhum.

- [ ] **Step 2: Botão "Marcar como pago" ganha ícone e vira "Renovar assinatura"**

Abrir `src/components/admin/TenantAdminForm.tsx`. No topo do arquivo,
adicionar o import do ícone:

```tsx
import { RefreshCw } from 'lucide-react'
```

Trocar o primeiro botão (linhas 56-62 no arquivo atual) de:

```tsx
        <button
          disabled={isPending}
          onClick={() => runAction(() => markPaidAction(tenantId))}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Marcar como pago
        </button>
```

Para:

```tsx
        <button
          disabled={isPending}
          onClick={() => runAction(() => markPaidAction(tenantId))}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" />
          Renovar assinatura
        </button>
```

`bg-accent` já resolve pra verde-petróleo (`#0f6e56`) por causa do
`data-palette="petroleo"` do Step 1 — nenhuma cor hardcoded aqui.

- [ ] **Step 3: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint "src/app/admin/(panel)/layout.tsx" src/components/admin/TenantAdminForm.tsx
```

Esperado: sem erros nos dois comandos.

- [ ] **Step 4: Verificação manual no browser**

Suba o dev server (`npm run dev`), logue em `/admin/login` (senha temporária
já gerada), abra `/admin` e `/admin/tenants/<algum-id>`:
- Header do painel deve estar verde-petróleo (`#0F6E56`) com logo branca e
  "Painel Admin" em texto branco.
- Botão "Renovar assinatura" na página do tenant deve estar verde-petróleo
  com ícone de refresh, mais destacado que "Ativar"/"Cancelar" (que
  continuam só com borda).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(panel)/layout.tsx" src/components/admin/TenantAdminForm.tsx
git commit -m "Redesign do painel admin: paleta petróleo, logo branca, botão de renovação em destaque"
```

---

## Task 2: Tela de login do admin ganha logo

**Files:**
- Modify: `src/components/admin/AdminLoginForm.tsx`

**Interfaces:**
- Consumes: `adminLoginAction` (já existe, sem mudança de assinatura).
- Produces: nenhuma.

- [ ] **Step 1: Adicionar logo petróleo no topo do form**

Abrir `src/components/admin/AdminLoginForm.tsx`. Adicionar o import no topo:

```tsx
import Image from 'next/image'
```

Substituir a linha do `<h1>` (atualmente `<h1 className="mb-6 text-2xl font-semibold text-text">Painel Admin — NexHub</h1>`) por:

```tsx
      <div className="mb-8 flex items-center gap-2">
        <Image src="/brand/nexhub-icon-petroleo.png" alt="" width={30} height={30} />
        <span className="text-2xl font-extrabold" style={{ color: '#0F6E56' }}>
          NexHub
        </span>
      </div>

      <h1 className="mb-6 text-lg font-semibold text-text">Painel Admin</h1>
```

- [ ] **Step 2: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint src/components/admin/AdminLoginForm.tsx
```

Esperado: sem erros.

- [ ] **Step 3: Verificação manual**

Abrir `/admin/login` no browser (deslogado — usar aba anônima ou sign out
primeiro). Deve mostrar ícone + "NexHub" em verde-petróleo acima de "Painel
Admin", mesma linguagem visual do `/login` de tenant.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminLoginForm.tsx
git commit -m "Adiciona logo à tela de login do admin"
```

---

## Task 3: Server action de PIX de assinatura (lado tenant)

**Files:**
- Create: `src/app/actions/subscription.ts`
- Modify: `.env.local` (adicionar `ADMIN_PIX_KEY`, `ADMIN_PIX_RECEIVER_NAME`)
- Modify: `.env.example` (documentar as duas vars novas)

**Interfaces:**
- Consumes: `getCurrentTenant()` (`src/lib/tenant.ts`), `generatePixQr()` (`src/lib/pix.ts`, assinatura `{ pixKey, receiverName, amount, txid }` → `Promise<{ error: string } | { brCode: string; qrImage: string }>`).
- Produces: `generateSubscriptionPixAction(): Promise<{ error: string } | { qrImage: string; brCode: string; amount: number }>` — usado pela Task 4.

- [ ] **Step 1: Adicionar env vars**

Abrir `.env.local` e adicionar ao final (usar a chave Pix real do Cauê —
placeholder aqui, ele troca depois):

```
ADMIN_PIX_KEY="00000000000"
ADMIN_PIX_RECEIVER_NAME="Caue Ribeiro"
```

Abrir `.env.example` e adicionar a mesma coisa, mas com placeholder
explícito:

```
ADMIN_PIX_KEY=""
ADMIN_PIX_RECEIVER_NAME=""
```

- [ ] **Step 2: Criar a server action**

Criar `src/app/actions/subscription.ts`:

```tsx
'use server'

import { getCurrentTenant } from '@/lib/tenant'
import { generatePixQr } from '@/lib/pix'

export async function generateSubscriptionPixAction(): Promise<
  { error: string } | { qrImage: string; brCode: string; amount: number }
> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (!tenant.monthly_price) return { error: 'Valor da assinatura não configurado — fale com o suporte.' }

  const pixKey = process.env.ADMIN_PIX_KEY
  const receiverName = process.env.ADMIN_PIX_RECEIVER_NAME
  if (!pixKey || !receiverName) return { error: 'PIX de renovação não configurado — fale com o suporte.' }

  const result = await generatePixQr({
    pixKey,
    receiverName,
    amount: tenant.monthly_price,
    txid: tenant.id,
  })

  if ('error' in result) return { error: result.error }

  return { qrImage: result.qrImage, brCode: result.brCode, amount: tenant.monthly_price }
}
```

- [ ] **Step 3: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint src/app/actions/subscription.ts
```

Esperado: sem erros. Se `tsc` reclamar de `string | undefined` no retorno
(mesmo padrão de erro visto antes nesse projeto com server actions e union
types), é porque a anotação de retorno explícita já resolve — confirmar que
ela está presente exatamente como no código acima.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/subscription.ts .env.example
git commit -m "Adiciona server action de geração de PIX pra renovação de assinatura"
```

Nota: `.env.local` não entra no commit (já está no `.gitignore` do projeto).

---

## Task 4: Badge de assinatura + modal de renovação na Sidebar do cliente

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/Sidebar.tsx`
- Create: `src/components/SubscriptionRenewModal.tsx`

**Interfaces:**
- Consumes: `generateSubscriptionPixAction()` (Task 3), `getCurrentTenant()` (`src/lib/tenant.ts`).
- Produces: `Sidebar` passa a aceitar prop `subscription: { status: SubscriptionStatus; daysLeft: number | null }` — nenhum outro arquivo além do layout consome isso.

- [ ] **Step 1: Buscar dados de assinatura no layout e calcular dias restantes**

Abrir `src/app/(dashboard)/layout.tsx` e substituir por:

```tsx
import { Sidebar } from '@/components/Sidebar'
import { getCurrentTenant } from '@/lib/tenant'

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00Z`).getTime()
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime()
  return Math.round((target - today) / 86400000)
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getCurrentTenant()
  const relevantDate = tenant?.subscription_status === 'trial' ? tenant.trial_ends_at : tenant?.next_due_date
  const daysLeft = daysUntil(relevantDate ?? null)

  return (
    <div className="flex min-h-screen">
      <Sidebar subscription={{ status: tenant?.subscription_status ?? 'trial', daysLeft }} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Criar o modal de renovação**

Criar `src/components/SubscriptionRenewModal.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { generateSubscriptionPixAction } from '@/app/actions/subscription'

export function SubscriptionRenewModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; qrImage: string; brCode: string; amount: number }
  >({ status: 'loading' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateSubscriptionPixAction().then((result) => {
      if ('error' in result) {
        setState({ status: 'error', message: result.error })
        return
      }
      setState({ status: 'ok', ...result })
    })
  }, [])

  async function handleCopy(brCode: string) {
    await navigator.clipboard.writeText(brCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text">Renovar assinatura</h2>

        {state.status === 'loading' && <p className="text-sm text-text-secondary">Gerando QR code...</p>}

        {state.status === 'error' && <p className="text-sm text-status-cancelled">{state.message}</p>}

        {state.status === 'ok' && (
          <>
            <p className="text-sm text-text-secondary">
              Valor: <strong className="text-text">R$ {state.amount.toFixed(2)}</strong>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qrImage} alt="QR Code Pix" className="h-56 w-56 self-center" />
            <textarea
              readOnly
              value={state.brCode}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => handleCopy(state.brCode)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text"
            >
              {copied ? 'Copiado!' : 'Copiar Pix Copia e Cola'}
            </button>
          </>
        )}

        <button type="button" onClick={onClose} className="text-sm text-text-secondary hover:underline">
          Fechar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Adicionar badge + botão Renovar na Sidebar**

Abrir `src/components/Sidebar.tsx`. Adicionar imports no topo:

```tsx
import { SubscriptionRenewModal } from '@/components/SubscriptionRenewModal'
import type { SubscriptionStatus } from '@/lib/supabase/types'
```

Mudar a assinatura da função de `export function Sidebar() {` para:

```tsx
export function Sidebar({
  subscription,
}: {
  subscription: { status: SubscriptionStatus; daysLeft: number | null }
}) {
```

Dentro do componente, logo após a linha `const [collapsed, setCollapsed] = useState(false)`, adicionar:

```tsx
  const [showRenewModal, setShowRenewModal] = useState(false)
```

Adicionar o bloco do badge — inserir imediatamente antes do bloco `<div className="flex flex-col gap-1 p-2" ...>` (o rodapé com "Recolher"/"Sair"), e depois do `</nav>`:

```tsx
      {!collapsed && subscription.daysLeft !== null && (
        <div className="mx-2 mb-2 rounded-lg px-3 py-2 text-xs" style={textMuted}>
          {subscription.status === 'trial' ? (
            <span>Teste expira em {Math.max(subscription.daysLeft, 0)}d</span>
          ) : (
            <span>Vence em {Math.max(subscription.daysLeft, 0)}d</span>
          )}
          {subscription.status !== 'trial' && (
            <button
              type="button"
              onClick={() => setShowRenewModal(true)}
              className="mt-1 block font-semibold underline"
              style={textFull}
            >
              Renovar
            </button>
          )}
        </div>
      )}
```

E, no fim do JSX do componente (logo antes do `</aside>` de fechamento, depois do bloco `<style jsx>`), adicionar a renderização condicional do modal — como `<style jsx>` já é o último filho, inserir depois dele, ainda dentro de `</aside>`:

```tsx
      {showRenewModal && <SubscriptionRenewModal onClose={() => setShowRenewModal(false)} />}
```

- [ ] **Step 4: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint src/components/Sidebar.tsx src/components/SubscriptionRenewModal.tsx "src/app/(dashboard)/layout.tsx"
```

Esperado: sem erros.

- [ ] **Step 5: Verificação manual**

No dev server, logar como um tenant existente (ex: `teste.nexhub@example.com`
se souber a senha, ou qualquer tenant de teste disponível):
- Sidebar expandida deve mostrar "Teste expira em Xd" (se `trial`) ou "Vence
  em Xd" + botão "Renovar" (se `active`).
- Clicar "Renovar" abre modal, gera QR (ou mostra erro claro se
  `ADMIN_PIX_KEY` ainda for o placeholder inválido — nesse caso confirmar que
  a mensagem de erro aparece, não uma tela quebrada).
- Fechar modal (botão "Fechar" ou clicar fora) funciona.
- Sidebar recolhida (`collapsed`) não deve quebrar layout (o badge some
  quando `collapsed`, conforme código acima).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/layout.tsx" src/components/Sidebar.tsx src/components/SubscriptionRenewModal.tsx
git commit -m "Adiciona badge de assinatura e renovação via PIX na sidebar do cliente"
```

---

## Task 5: Migration — coluna `onboarding_completed`

**Files:**
- Create: `009_tenant_onboarding.sql`

**Interfaces:**
- Consumes: nenhuma.
- Produces: coluna `tenants.onboarding_completed boolean not null default true` — consumida pelas Tasks 6, 7 e 8.

- [ ] **Step 1: Criar o arquivo de migration**

Criar `009_tenant_onboarding.sql` na raiz do projeto:

```sql
-- ============================================================
-- FASE: onboarding de tenant criado via "gerar teste" (admin)
-- ============================================================
-- Tenants criados pelo /cadastro tradicional já preenchem nome/nicho/paleta
-- na hora, então nascem com onboarding_completed = true (default). Só
-- tenants criados via generateTrialTenantAction (painel admin) nascem com
-- false e passam pela tela /onboarding no primeiro login.

alter table tenants add column onboarding_completed boolean not null default true;
```

- [ ] **Step 2: Rodar manualmente no Supabase**

Este passo não é automatizável por este agente (mutação direta de schema em
produção via SQL) — pedir pro Cauê rodar o conteúdo do arquivo no SQL Editor
do Supabase Dashboard (`https://supabase.com/dashboard/project/mbgndoxqntynapfwatim/sql/new`)
antes de seguir pra Task 6, já que ela depende da coluna existir.

- [ ] **Step 3: Commit**

```bash
git add 009_tenant_onboarding.sql
git commit -m "Migration: coluna onboarding_completed em tenants"
```

---

## Task 6: Admin — botão "Gerar teste" (cria tenant só com email)

**Files:**
- Modify: `src/app/actions/admin-tenants.ts`
- Create: `src/components/admin/GenerateTrialTenantForm.tsx`
- Modify: `src/app/admin/(panel)/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin()` (já existe no próprio arquivo `admin-tenants.ts`), tabela `niches` (colunas `id`, `sort_order`).
- Produces: `generateTrialTenantAction(email: string): Promise<{ error: string } | { tempPassword: string; email: string }>` — consumido só pelo `GenerateTrialTenantForm`.

**Depende da Task 5 estar aplicada no banco (coluna `onboarding_completed`).**

- [ ] **Step 1: Adicionar a server action**

Abrir `src/app/actions/admin-tenants.ts`. Adicionar ao final do arquivo:

```tsx
export async function generateTrialTenantAction(
  email: string
): Promise<{ error: string } | { tempPassword: string; email: string }> {
  const supabase = await requireAdmin()

  const { data: niche } = await supabase
    .from('niches')
    .select('id')
    .eq('active', true)
    .order('sort_order')
    .limit(1)
    .single()

  if (!niche) return { error: 'Nenhum nicho ativo cadastrado.' }

  const tempPassword = crypto.randomBytes(9).toString('base64url')

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Não foi possível criar a conta.' }
  }

  const trialEndsAt = new Date()
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + 7)

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: 'Novo tenant',
      niche_id: niche.id,
      theme_palette: 'petroleo',
      subscription_status: 'trial',
      trial_ends_at: trialEndsAt.toISOString().slice(0, 10),
      onboarding_completed: false,
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: tenantError?.message ?? 'Não foi possível criar o tenant.' }
  }

  const { error: userError } = await supabase.from('users').insert({
    tenant_id: tenant.id,
    auth_id: authData.user.id,
    email,
    role: 'owner',
  })

  if (userError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: userError.message }
  }

  revalidatePath('/admin')

  return { tempPassword, email }
}
```

- [ ] **Step 2: Criar o formulário**

Criar `src/components/admin/GenerateTrialTenantForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { generateTrialTenantAction } from '@/app/actions/admin-tenants'

export function GenerateTrialTenantForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await generateTrialTenantAction(email)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setResult(res)
      setEmail('')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Gerar teste
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-text">Email do lead</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Criando...' : 'Criar tenant de teste'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary">
          Cancelar
        </button>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      {result && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <p className="text-text-secondary">
            Tenant criado pra <strong>{result.email}</strong>. Senha temporária — repassa pro lead:
          </p>
          <p className="mt-2 font-mono text-base font-semibold text-text">{result.tempPassword}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Adicionar o botão no dashboard admin**

Abrir `src/app/admin/(panel)/page.tsx`. Adicionar o import no topo:

```tsx
import { GenerateTrialTenantForm } from '@/components/admin/GenerateTrialTenantForm'
```

Trocar a linha `<h1 className="text-2xl font-semibold text-text">Tenants</h1>` por:

```tsx
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Tenants</h1>
        <GenerateTrialTenantForm />
      </div>
```

- [ ] **Step 4: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint src/app/actions/admin-tenants.ts src/components/admin/GenerateTrialTenantForm.tsx "src/app/admin/(panel)/page.tsx"
```

Esperado: sem erros. Se `tsc` reclamar de `crypto` não definido em
`admin-tenants.ts`, confirmar que o import `import crypto from 'crypto'` já
existe no topo do arquivo (foi adicionado numa sessão anterior — ver
`generateTempPasswordAction` no mesmo arquivo, que já usa o mesmo padrão).

- [ ] **Step 5: Verificação manual**

No painel admin (`/admin`), clicar "Gerar teste", digitar um email real
(ex: um Gmail seu com `+teste`), confirmar que aparece a senha temporária na
tela e que um novo tenant "Novo tenant" aparece na lista com status "Trial".

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/admin-tenants.ts src/components/admin/GenerateTrialTenantForm.tsx "src/app/admin/(panel)/page.tsx"
git commit -m "Admin: botão gerar tenant de teste a partir só do email do lead"
```

---

## Task 7: Proxy redireciona pra `/onboarding` quando pendente

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: tabela `users` (join `tenants.onboarding_completed`) via RLS (policy já existente, `users isolation - select` + `tenant isolation - select`).
- Produces: nenhuma nova — só redirect.

**Depende da Task 5 estar aplicada no banco.**

- [ ] **Step 1: Adicionar `/onboarding` às rotas e a checagem**

Abrir `src/proxy.ts`. Trocar a linha:

```ts
const PUBLIC_ROUTES = ['/login', '/cadastro', '/reset-password']
```

Por (adiciona `/onboarding` como rota "autenticada mas não pública" — não
entra em `PUBLIC_ROUTES`, é tratada à parte):

```ts
const PUBLIC_ROUTES = ['/login', '/cadastro', '/reset-password']
const ONBOARDING_ROUTE = '/onboarding'
```

Depois do bloco:

```ts
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
```

Adicionar:

```ts
  if (user && pathname !== ONBOARDING_ROUTE && !isPublicRoute) {
    const { data: userRow } = await supabase
      .from('users')
      .select('tenants(onboarding_completed)')
      .eq('auth_id', user.id)
      .single()

    const tenant = userRow?.tenants as { onboarding_completed: boolean } | null
    if (tenant && !tenant.onboarding_completed) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
    }
  }

  if (user && pathname === ONBOARDING_ROUTE) {
    const { data: userRow } = await supabase
      .from('users')
      .select('tenants(onboarding_completed)')
      .eq('auth_id', user.id)
      .single()

    const tenant = userRow?.tenants as { onboarding_completed: boolean } | null
    if (tenant?.onboarding_completed) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
```

- [ ] **Step 2: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint src/proxy.ts
```

Esperado: sem erros. Se `tsc` reclamar do tipo de `userRow?.tenants` (pode
inferir como array em vez de objeto dependendo do tipo gerado em
`src/lib/supabase/types.ts` pra relação `users -> tenants`), ajustar o cast
pra `(Array.isArray(userRow?.tenants) ? userRow.tenants[0] : userRow?.tenants)`
mantendo o mesmo shape `{ onboarding_completed: boolean } | undefined`.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "Proxy redireciona tenant com onboarding pendente pra /onboarding"
```

(Verificação manual desta task acontece junto com a Task 8, já que
`/onboarding` ainda não existe como página até lá — rodar as duas antes de
testar no browser.)

---

## Task 8: Página `/onboarding` (nome, nicho, paleta)

**Files:**
- Create: `src/app/actions/onboarding.ts`
- Create: `src/components/onboarding/OnboardingForm.tsx`
- Create: `src/app/onboarding/page.tsx`

**Interfaces:**
- Consumes: `getCurrentTenant()` (`src/lib/tenant.ts`), `getNiches()` (`src/lib/niches.ts`), `PALETTES` (`src/lib/palettes.ts`), `DynamicIcon` (`src/lib/dynamic-icon.ts`) — todos já existem, reaproveitados do `/cadastro`.
- Produces: `completeOnboardingAction(input: { businessName: string; nicheId: string; palette: PaletteType }): Promise<{ error: string } | never>` (sucesso faz `redirect('/')`, igual padrão de `cadastroAction`).

**Depende das Tasks 5 e 7.**

- [ ] **Step 1: Server action**

Criar `src/app/actions/onboarding.ts`:

```tsx
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { PaletteType } from '@/lib/supabase/types'

export type OnboardingInput = {
  businessName: string
  nicheId: string
  palette: PaletteType
}

export async function completeOnboardingAction(input: OnboardingInput): Promise<{ error: string } | never> {
  const { businessName, nicheId, palette } = input

  if (!businessName.trim() || !nicheId || !palette) {
    return { error: 'Preencha todos os campos.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      name: businessName,
      niche_id: nicheId,
      theme_palette: palette,
      onboarding_completed: true,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  redirect('/')
}
```

- [ ] **Step 2: Formulário (reaproveita visual do CadastroWizard, sem os passos de email/senha)**

Criar `src/components/onboarding/OnboardingForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { completeOnboardingAction } from '@/app/actions/onboarding'
import { DynamicIcon } from '@/lib/dynamic-icon'
import { PALETTES } from '@/lib/palettes'
import type { Niche } from '@/lib/niches'
import type { PaletteType } from '@/lib/supabase/types'

type Step = 1 | 2

export function OnboardingForm({ niches }: { niches: Niche[] }) {
  const [step, setStep] = useState<Step>(1)
  const [businessName, setBusinessName] = useState('')
  const [nicheId, setNicheId] = useState<string | null>(null)
  const [palette, setPalette] = useState<PaletteType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!nicheId || !palette) return
    setError(null)
    startTransition(async () => {
      const result = await completeOnboardingAction({ businessName, nicheId, palette })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-text">Bem-vindo ao NexHub!</h1>
          <p className="text-text-secondary">Vamos configurar seu painel. Qual o nome do seu negócio?</p>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Nome do negócio</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Clínica Sorriso"
            />
          </label>

          <button
            disabled={businessName.trim().length === 0}
            onClick={() => setStep(2)}
            className="mt-2 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-text">Qual é o seu ramo?</h1>
          <p className="text-text-secondary">O painel já nasce configurado pro seu tipo de negócio.</p>

          <div className="grid grid-cols-2 gap-3">
            {niches.map((n) => (
              <button
                key={n.id}
                onClick={() => setNicheId(n.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
                  nicheId === n.id ? 'border-accent ring-2 ring-accent' : 'border-border'
                } bg-surface`}
              >
                <DynamicIcon name={n.icon} className="h-6 w-6 text-accent" />
                <span className="font-medium text-text">{n.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm font-medium text-text">Escolha o estilo visual</p>
          <div className="flex gap-2">
            {(Object.entries(PALETTES) as [PaletteType, (typeof PALETTES)[PaletteType]][]).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setPalette(key)}
                className={`flex-1 rounded-lg border p-3 text-left text-sm font-medium transition ${
                  palette === key ? 'border-accent ring-2 ring-accent' : 'border-border'
                }`}
                style={{ background: p.bg, color: p.text }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-status-cancelled">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-border px-4 py-2 text-text">
              Voltar
            </button>
            <button
              disabled={!nicheId || !palette || isPending}
              onClick={handleSubmit}
              className="flex-1 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              {isPending ? 'Salvando...' : 'Concluir'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Página**

Criar `src/app/onboarding/page.tsx`:

```tsx
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'
import { getNiches } from '@/lib/niches'

export default async function OnboardingPage() {
  const niches = await getNiches()
  return <OnboardingForm niches={niches} />
}
```

- [ ] **Step 4: Verificar tipos e lint**

```bash
npx tsc --noEmit
npx eslint src/app/actions/onboarding.ts src/components/onboarding/OnboardingForm.tsx src/app/onboarding/page.tsx
```

Esperado: sem erros.

- [ ] **Step 5: Verificação manual end-to-end (Tasks 5+6+7+8 juntas)**

1. No painel admin, "Gerar teste" com um email real que você controla.
2. Deslogar, ir em `/login`, entrar com esse email + senha temporária mostrada.
3. Confirmar que cai direto em `/onboarding` (não no dashboard `/`).
4. Preencher nome + nicho + paleta, "Concluir".
5. Confirmar que cai no dashboard normal (`/`) com a paleta escolhida
   aplicada (cor do accent muda de acordo).
6. Tentar acessar `/onboarding` de novo manualmente pela URL — deve
   redirecionar pra `/` (onboarding já concluído).

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/onboarding.ts src/components/onboarding/OnboardingForm.tsx src/app/onboarding/page.tsx
git commit -m "Adiciona tela de onboarding (nome, nicho, paleta) pra tenants criados via gerar teste"
```

---

## Task 9: Deploy

**Files:** nenhum (só operações de infra).

- [ ] **Step 1: Configurar env vars novas na Vercel**

```bash
vercel env add ADMIN_PIX_KEY production
vercel env add ADMIN_PIX_RECEIVER_NAME production
```

(Vai pedir o valor interativamente — usar a chave PIX real do Cauê, não o
placeholder do `.env.local`.)

- [ ] **Step 2: Confirmar migration 009 já rodou em produção**

Perguntar pro Cauê se já rodou `009_tenant_onboarding.sql` no SQL Editor do
Supabase (Task 5, Step 2). Deploy sem essa coluna quebra as Tasks 6/7/8 em
produção.

- [ ] **Step 3: Deploy**

```bash
vercel --prod --yes
```

Confirmar no output que o build passou sem erro de TypeScript e que as
rotas novas aparecem na lista (`/onboarding`, e as existentes
`/admin`, `/login` etc.).

- [ ] **Step 4: Smoke test em produção**

Repetir o Step 5 da Task 8 (fluxo end-to-end) mas em
`https://nexhub.nexvix.com.br` em vez de localhost.
