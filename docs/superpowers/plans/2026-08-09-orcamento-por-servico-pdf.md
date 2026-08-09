# Orçamento por serviço + PDF (com odontograma) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catálogo de serviços reutilizável pra montar orçamento sem digitar tudo do zero, e impressão do orçamento em PDF (via página HTML de impressão) em 3 variações, com odontograma na variante completa.

**Architecture:** Tabela `services` nova (nome + valor padrão, por tenant) alimenta um seletor no formulário de orçamento existente. Impressão é um novo route group `(print)` — mesmo prefixo de URL de `/clientes/[id]/orcamentos/...`, mas árvore de arquivos separada da `(dashboard)`, sem sidebar, protegida pelo middleware global (`src/proxy.ts`) do mesmo jeito que o resto do app (não precisa de auth extra no layout). O odontograma ganha uma versão estática (sem clique/interação) reutilizando o `ToothIcon` já redesenhado, pra embutir no PDF.

**Tech Stack:** Next.js 16 (App Router, server actions + route handlers), Supabase (Postgres + RLS), TypeScript, Tailwind (variant `print:` já disponível, sem config extra).

## Global Constraints

- Migrations SQL são arquivos numerados na raiz do repo (`001_...` a `013_...`), aplicados manualmente via Supabase Dashboard > SQL Editor.
- `src/lib/supabase/types.ts` é mantido manualmente — toda migration precisa de update correspondente.
- Sem biblioteca de geração de PDF — impressão é HTML + `window.print()` do navegador (usuário salva como PDF pelo próprio diálogo de impressão).
- `src/proxy.ts` é o middleware global de auth (não há `middleware.ts` separado) — qualquer rota nova fora de `PUBLIC_ROUTES`/`OPEN_ROUTES` já fica automaticamente protegida, sem precisar de lógica de sessão adicional na página/layout.
- Spec de referência: `docs/superpowers/specs/2026-08-09-orcamento-por-servico-pdf-design.md`.

---

## Task 1: Migration de schema

**Files:**
- Create: `014_orcamento_servicos_pdf.sql`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: tabela `services`, `tenants.phone`/`email`/`address`, `professionals.registration_number`, `treatment_budgets.professional_id`. Tipo `BudgetItem` ganha `service_id?: string`.

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- ============================================================
-- FASE: catálogo de serviços + dados de documento (PDF de orçamento)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

create table services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  default_value numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_services_tenant on services(tenant_id);

alter table services enable row level security;
create policy "services isolation - all" on services
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

alter table tenants add column phone text;
alter table tenants add column email text;
alter table tenants add column address text;

alter table professionals add column registration_number text;

alter table treatment_budgets add column professional_id uuid references professionals(id) on delete set null;
```

- [ ] **Step 2: Aplicar manualmente no Supabase Dashboard > SQL Editor.** Confirmar sem erro.

- [ ] **Step 3: Atualizar `src/lib/supabase/types.ts`**

No topo do arquivo, no tipo `BudgetItem` (por volta da linha 23), adicionar campo opcional:

```ts
export type BudgetItem = {
  description: string
  quantity: number
  unit_price: number
  tooth_number?: string
  faces?: string[]
  service_id?: string
}
```

No bloco `tenants`, Row (depois de `whatsapp_qr_requested_at: string | null`):

```ts
          whatsapp_qr_requested_at: string | null
          phone: string | null
          email: string | null
          address: string | null
```

Insert (mesmo ponto):

```ts
          whatsapp_qr_requested_at?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
```

No bloco `professionals`, Row (depois de `created_at: string`):

```ts
        Row: {
          id: string
          tenant_id: string
          name: string
          color: string
          active: boolean
          created_at: string
          registration_number: string | null
        }
```

Insert (mesmo bloco):

```ts
        Insert: {
          id?: string
          tenant_id: string
          name: string
          color: string
          active?: boolean
          created_at?: string
          registration_number?: string | null
        }
```

No bloco `treatment_budgets`, Row (depois de `followup_day7_sent_at: string | null` — campo adicionado pela feature anterior de orçamento parado):

```ts
          followup_day7_sent_at: string | null
          professional_id: string | null
```

Insert (mesmo bloco):

```ts
          followup_day7_sent_at?: string | null
          professional_id?: string | null
```

No `Relationships` do bloco `treatment_budgets` (mesmo array que já tem `treatment_budgets_client_id_fkey` e `treatment_budgets_tenant_id_fkey`), adicionar mais uma entrada:

```ts
          {
            foreignKeyName: 'treatment_budgets_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
```

Por fim, adicionar a tabela `services` — inserir antes da linha `Views: Record<string, never>` (depois do bloco `packages`):

```ts
      services: {
        Row: {
          id: string
          tenant_id: string
          name: string
          default_value: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          default_value?: number
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'services_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add 014_orcamento_servicos_pdf.sql src/lib/supabase/types.ts
git commit -m "feat: schema pro catalogo de servicos e dados de documento do orcamento"
```

---

## Task 2: Catálogo de serviços (CRUD)

**Files:**
- Create: `src/app/actions/services.ts`
- Create: `src/components/configuracoes/ServicesForm.tsx`
- Create: `src/app/(dashboard)/configuracoes/servicos/page.tsx`

**Interfaces:**
- Produces: linhas em `services` — consumidas pela Task 3 (`ServiceAutocomplete`).
- Consumes: `getCurrentTenant()`, `createClient()` (mesmo padrão de `procedure-types.ts`).

- [ ] **Step 1: Server actions**

`src/app/actions/services.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createServiceAction(name: string, defaultValue: number) {
  if (!name.trim()) return { error: 'Informe um nome.' }
  if (defaultValue < 0) return { error: 'Valor não pode ser negativo.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .insert({ tenant_id: tenant.id, name: name.trim(), default_value: defaultValue })
    .select('id, name, default_value, active')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/servicos')
  return { data }
}

export async function toggleServiceAction(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('services').update({ active }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/servicos')
}
```

- [ ] **Step 2: Componente de formulário/lista**

`src/components/configuracoes/ServicesForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createServiceAction, toggleServiceAction } from '@/app/actions/services'

type Service = { id: string; name: string; default_value: number; active: boolean }

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ServicesForm({ initial }: { initial: Service[] }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createServiceAction(name, Number(value) || 0)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setValue('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-text">Novo serviço</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Restauração em resina"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-sm font-medium text-text">Valor</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          Adicionar
        </button>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {initial.map((s) => (
          <label key={s.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-text">
              {s.name} <span className="text-text-secondary">— {formatBRL(s.default_value)}</span>
            </span>
            <input
              type="checkbox"
              checked={s.active}
              onChange={(e) =>
                startTransition(async () => {
                  await toggleServiceAction(s.id, e.target.checked)
                })
              }
            />
          </label>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Página de configuração**

`src/app/(dashboard)/configuracoes/servicos/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { ServicesForm } from '@/components/configuracoes/ServicesForm'

export default async function ServicosPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const { data: services } = tenant
    ? await supabase
        .from('services')
        .select('id, name, default_value, active')
        .eq('tenant_id', tenant.id)
        .order('name')
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Serviços</h1>
        <p className="text-text-secondary">
          Catálogo de serviços/tratamentos com valor padrão, usado ao montar um orçamento.
          Desmarque pra esconder sem apagar o histórico.
        </p>
      </div>
      <ServicesForm initial={services ?? []} />
    </div>
  )
}
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/services.ts src/components/configuracoes/ServicesForm.tsx "src/app/(dashboard)/configuracoes/servicos/page.tsx"
git commit -m "feat: catalogo de servicos pra orcamento"
```

---

## Task 3: Integrar catálogo no formulário de orçamento

**Files:**
- Modify: `src/components/orcamentos/TreatmentBudgetForm.tsx`
- Modify: `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx`
- Modify: `src/app/actions/treatment-budgets.ts`

**Interfaces:**
- Consumes: tabela `services` (Task 2), `treatment_budgets.professional_id` (Task 1).
- Produces: `BudgetItem.service_id` preenchido quando o item vem do catálogo — consumido só como referência. `treatment_budgets.professional_id` preenchido — consumido pela Task 6 (assinatura do PDF).

- [ ] **Step 1: Aceitar `professionalId` na action de criar orçamento**

Em `src/app/actions/treatment-budgets.ts`, atualizar o tipo e a função:

```ts
export type BudgetInput = {
  items: BudgetItem[]
  downPayment: number
  installments: number
  discount: number
  professionalId?: string
}
```

No `.insert({...})` dentro de `createBudgetAction`, adicionar:

```ts
    professional_id: input.professionalId || null,
```

- [ ] **Step 2: Buscar profissionais e serviços na página e passar pro formulário**

Em `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx`, adicionar as buscas e passar como prop pro `TreatmentBudgetForm`. Trocar:

```tsx
      <TreatmentBudgetForm clientId={id} />
```

Por (adicionando as queries antes do `return` e o import):

```ts
import { TreatmentBudgetForm } from '@/components/orcamentos/TreatmentBudgetForm'
```

```ts
  const { data: services } = await supabase
    .from('services')
    .select('id, name, default_value')
    .eq('active', true)
    .order('name')

  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name')
    .eq('active', true)
    .order('name')
```

```tsx
      <TreatmentBudgetForm clientId={id} services={services ?? []} professionals={professionals ?? []} />
```

(O import de `TreatmentBudgetForm` já existe no arquivo — só adicionar as duas queries e as props novas.)

- [ ] **Step 3: Adicionar seletor de profissional e de catálogo no formulário**

Em `src/components/orcamentos/TreatmentBudgetForm.tsx`, adicionar os tipos e a prop:

```ts
type Service = { id: string; name: string; default_value: number }
type Professional = { id: string; name: string }
```

Trocar a assinatura do componente:

```tsx
export function TreatmentBudgetForm({
  clientId,
  services,
  professionals,
}: {
  clientId: string
  services: Service[]
  professionals: Professional[]
}) {
```

Adicionar estado do profissional selecionado (junto dos outros `useState`):

```ts
  const [professionalId, setProfessionalId] = useState('')
```

Incluir `professionalId` no objeto passado pra `createBudgetAction` dentro de `handleSubmit` (adicionar ao objeto `{ items: valid, downPayment, installments, discount, professionalId }`).

Adicionar o `<select>` de profissional no JSX, logo abaixo do `<h2>Novo orçamento</h2>`:

```tsx
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Profissional responsável</span>
        <select
          className="max-w-xs rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
        >
          <option value="">Selecione</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
```

Adicionar estado pro modo "novo serviço inline" (nome/valor de um serviço sendo cadastrado na hora) logo depois dos outros `useState`:

```ts
  const [creatingServiceAt, setCreatingServiceAt] = useState<number | null>(null)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceValue, setNewServiceValue] = useState('')
  const [catalog, setCatalog] = useState(services)
```

Adicionar a função que aplica um serviço escolhido a um item, e a que cadastra um novo serviço inline (usa a action da Task 2 — importar `createServiceAction`):

```ts
import { createServiceAction } from '@/app/actions/services'
```

```ts
  function applyService(index: number, serviceId: string) {
    if (serviceId === '__new__') {
      setCreatingServiceAt(index)
      return
    }
    const service = catalog.find((s) => s.id === serviceId)
    if (!service) return
    updateItem(index, { service_id: service.id, description: service.name, unit_price: service.default_value })
  }

  function confirmNewService(index: number) {
    if (!newServiceName.trim()) return
    startTransition(async () => {
      const result = await createServiceAction(newServiceName, Number(newServiceValue) || 0)
      if (result && 'data' in result && result.data) {
        setCatalog((prev) => [...prev, result.data])
        updateItem(index, { service_id: result.data.id, description: result.data.name, unit_price: result.data.default_value })
      }
      setCreatingServiceAt(null)
      setNewServiceName('')
      setNewServiceValue('')
    })
  }
```

Trocar o campo de descrição (o primeiro `<input placeholder="Descrição" ...>` dentro do `.map` de `items`) por um `<select>` de catálogo + o input de descrição continua existindo logo abaixo (editável, pré-preenchido ao escolher do catálogo — mesmo comportamento do Codental: escolher do catálogo preenche, mas o texto final ainda pode ser ajustado):

```tsx
            <div className="flex gap-2">
              <select
                className="w-48 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.service_id ?? ''}
                onChange={(e) => applyService(i, e.target.value)}
              >
                <option value="">Selecione um serviço</option>
                {catalog.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__new__">+ Cadastrar novo serviço</option>
              </select>
              <input
                placeholder="Descrição"
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <select
                className="w-24 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.tooth_number}
                onChange={(e) => updateItem(i, { tooth_number: e.target.value })}
              >
                <option value="">Dente</option>
                {ALL_TEETH.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="w-16 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.quantity}
                onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                step={0.01}
                className="w-24 rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none focus:border-accent"
                value={item.unit_price}
                onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })}
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} className="text-status-cancelled">
                  ✕
                </button>
              )}
            </div>

            {creatingServiceAt === i && (
              <div className="flex items-end gap-2 rounded-lg border border-dashed border-border p-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-text-secondary">Nome do novo serviço</span>
                  <input
                    className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                  />
                </label>
                <label className="flex w-24 flex-col gap-1">
                  <span className="text-xs text-text-secondary">Valor</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
                    value={newServiceValue}
                    onChange={(e) => setNewServiceValue(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => confirmNewService(i)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
                >
                  Salvar
                </button>
              </div>
            )}
```

(Essa substituição troca só o bloco `<div className="flex gap-2">...</div>` original de cada item — o restante do arquivo, incluindo o bloco de faces logo abaixo, permanece igual.)

`emptyItem()` não precisa mudar — `service_id` fica `undefined` até o usuário escolher.

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/orcamentos/TreatmentBudgetForm.tsx "src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx" src/app/actions/treatment-budgets.ts
git commit -m "feat: seletor de profissional e catalogo de servicos no formulario de orcamento"
```

---

## Task 4: Dados de documento (clínica + registro profissional)

**Files:**
- Create: `src/app/actions/tenant-profile.ts`
- Create: `src/components/configuracoes/ClinicProfileForm.tsx`
- Create: `src/app/(dashboard)/configuracoes/clinica/page.tsx`
- Modify: `src/app/actions/professionals.ts`
- Modify: `src/components/agenda/ProfessionalForm.tsx`

**Interfaces:**
- Produces: `tenants.phone`/`email`/`address`, `professionals.registration_number` preenchidos — consumidos pela Task 5 (páginas de impressão).

- [ ] **Step 1: Server action de perfil da clínica**

`src/app/actions/tenant-profile.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateClinicProfileAction(input: { phone: string; email: string; address: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      address: input.address.trim() || null,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/clinica')
}
```

- [ ] **Step 2: Formulário**

`src/components/configuracoes/ClinicProfileForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateClinicProfileAction } from '@/app/actions/tenant-profile'

export function ClinicProfileForm({
  initialPhone,
  initialEmail,
  initialAddress,
}: {
  initialPhone: string
  initialEmail: string
  initialAddress: string
}) {
  const [phone, setPhone] = useState(initialPhone)
  const [email, setEmail] = useState(initialEmail)
  const [address, setAddress] = useState(initialAddress)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateClinicProfileAction({ phone, email, address })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Telefone</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setSaved(false)
          }}
          placeholder="(11) 99999-9999"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">E-mail</span>
        <input
          type="email"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setSaved(false)
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Endereço</span>
        <textarea
          rows={2}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            setSaved(false)
          }}
          placeholder="Rua, número, sala, bairro, cidade - UF, CEP"
        />
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

- [ ] **Step 3: Página de configuração**

`src/app/(dashboard)/configuracoes/clinica/page.tsx`:

```tsx
import { getCurrentTenant } from '@/lib/tenant'
import { ClinicProfileForm } from '@/components/configuracoes/ClinicProfileForm'

export default async function ClinicaConfigPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Dados da clínica</h1>
        <p className="text-text-secondary">
          Telefone, e-mail e endereço exibidos no cabeçalho dos documentos (orçamentos impressos).
        </p>
      </div>
      {tenant && (
        <ClinicProfileForm
          initialPhone={tenant.phone ?? ''}
          initialEmail={tenant.email ?? ''}
          initialAddress={tenant.address ?? ''}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Registro profissional no cadastro de profissional**

Em `src/app/actions/professionals.ts`, atualizar o tipo e as duas actions:

```ts
export type ProfessionalInput = { name: string; color: string; active?: boolean; registrationNumber?: string }
```

Em `createProfessionalAction`, no `.insert({...})`, adicionar:

```ts
    registration_number: input.registrationNumber?.trim() || null,
```

Em `updateProfessionalAction`, no `.update({...})`, adicionar:

```ts
    registration_number: input.registrationNumber?.trim() || null,
```

Em `src/components/agenda/ProfessionalForm.tsx`, adicionar o campo. Trocar a prop `initial`:

```tsx
  initial,
}: {
  professionalId?: string
  initial?: { name: string; color: string; active: boolean; registrationNumber?: string }
}) {
```

Adicionar estado (junto dos outros `useState`):

```ts
  const [registrationNumber, setRegistrationNumber] = useState(initial?.registrationNumber ?? '')
```

Incluir no `handleSubmit`, dentro dos objetos passados pras actions (`{ name, color, active, registrationNumber }` no update e `{ name, color, registrationNumber }` no create — trocar as duas chamadas existentes pra incluir o campo novo).

Adicionar o campo no JSX, depois do bloco de cor de identificação e antes do checkbox "Ativo":

```tsx
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Registro profissional (CRO/CRM)</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="Ex: CRO 12345"
        />
      </label>
```

Em `src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx`, incluir `registration_number` no `.select('*')` (já usa `*`, então já vem) e passar `registrationNumber: professional.registration_number ?? undefined` no `initial` passado pro `ProfessionalForm`.

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/tenant-profile.ts src/components/configuracoes/ClinicProfileForm.tsx "src/app/(dashboard)/configuracoes/clinica/page.tsx" src/app/actions/professionals.ts src/components/agenda/ProfessionalForm.tsx "src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx"
git commit -m "feat: dados da clinica e registro profissional pro documento de orcamento"
```

---

## Task 5: Odontograma estático (pra impressão)

**Files:**
- Create: `src/components/odontograma/OdontogramStatic.tsx`

**Interfaces:**
- Consumes: `ToothIcon`, `UPPER_TEETH`/`LOWER_TEETH`/`STATUS_LABEL`/`STATUS_COLOR`/`toothKind` (`src/lib/odontogram.ts`).
- Produces: componente `OdontogramStatic` — consumido pela Task 6 (variante "Completo" do PDF).

- [ ] **Step 1: Implementar**

`src/components/odontograma/OdontogramStatic.tsx`:

```tsx
import { UPPER_TEETH, LOWER_TEETH, STATUS_LABEL, STATUS_COLOR, toothKind } from '@/lib/odontogram'
import { ToothIcon } from './ToothIcon'
import type { OdontogramStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as OdontogramStatus[]

// Versão somente-leitura do odontograma — usada no documento de impressão
// (não tem clique/popover como o OdontogramGrid, que é só pra tela interativa).
export function OdontogramStatic({ records }: { records: { tooth_number: string; status: OdontogramStatus }[] }) {
  const statusByTooth = new Map(records.map((r) => [r.tooth_number, r.status]))

  function row(teeth: string[], upper: boolean) {
    return (
      <div className="flex justify-center gap-1">
        {teeth.map((tooth) => {
          const status = statusByTooth.get(tooth) ?? 'saudavel'
          const badge = (
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[9px] text-text-secondary">
              {tooth}
            </span>
          )
          return (
            <div key={tooth} className="flex flex-col items-center gap-0.5">
              {upper && badge}
              <ToothIcon kind={toothKind(tooth)} upper={upper} color={STATUS_COLOR[status]} />
              {!upper && badge}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border p-4">
        {row(UPPER_TEETH, true)}
        <div className="my-3 border-t border-dashed border-border" />
        {row(LOWER_TEETH, false)}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        {STATUS_OPTIONS.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-border" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/odontograma/OdontogramStatic.tsx
git commit -m "feat: versao estatica do odontograma pra impressao"
```

---

## Task 6: Páginas de impressão do orçamento (3 variantes)

**Files:**
- Create: `src/app/(print)/layout.tsx`
- Create: `src/app/(print)/clientes/[id]/orcamentos/[budgetId]/imprimir/[variante]/page.tsx`
- Create: `src/components/orcamentos/BudgetPrintDocument.tsx`
- Create: `src/components/orcamentos/PrintButton.tsx`
- Modify: `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx`

**Interfaces:**
- Consumes: `OdontogramStatic` (Task 5).
- Produces: URLs `/clientes/{id}/orcamentos/{budgetId}/imprimir/total|padrao|completo`.

- [ ] **Step 1: Layout do route group `(print)`**

`src/app/(print)/layout.tsx`:

```tsx
// Sem sidebar/nav do dashboard — só o conteúdo do documento. Autenticação
// já é garantida pelo middleware global (src/proxy.ts): essa rota não está
// em PUBLIC_ROUTES nem OPEN_ROUTES, então já exige sessão como qualquer
// página do (dashboard), sem precisar repetir a checagem aqui.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">{children}</div>
}
```

- [ ] **Step 2: Botão de imprimir**

`src/components/orcamentos/PrintButton.tsx`:

```tsx
'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed right-6 top-6 rounded-lg bg-accent px-4 py-2 font-medium text-white shadow-lg"
    >
      Imprimir
    </button>
  )
}
```

- [ ] **Step 3: Componente de documento**

`src/components/orcamentos/BudgetPrintDocument.tsx`:

```tsx
import { OdontogramStatic } from '@/components/odontograma/OdontogramStatic'
import type { BudgetItem, OdontogramStatus } from '@/lib/supabase/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BudgetPrintDocument({
  variant,
  tenant,
  professional,
  client,
  budget,
  odontogramRecords,
}: {
  variant: 'total' | 'padrao' | 'completo'
  tenant: { name: string; phone: string | null; email: string | null; address: string | null }
  professional: { name: string; registration_number: string | null } | null
  client: { name: string }
  budget: { created_at: string; total: number; items: BudgetItem[] }
  odontogramRecords: { tooth_number: string; status: OdontogramStatus }[]
}) {
  const dateLabel = new Date(budget.created_at).toLocaleDateString('pt-BR')

  return (
    <div className="flex flex-col gap-6 text-text">
      <header className="border-b border-border pb-4">
        <h1 className="text-lg font-semibold">{tenant.name}</h1>
        <div className="flex flex-col text-sm text-text-secondary">
          {tenant.phone && <span>{tenant.phone}</span>}
          {tenant.email && <span>{tenant.email}</span>}
          {tenant.address && <span>{tenant.address}</span>}
        </div>
      </header>

      <div>
        <h2 className="font-semibold">Plano de tratamento de {client.name}</h2>
        <p className="text-sm text-text-secondary">Orçamento criado em {dateLabel}</p>
      </div>

      {variant !== 'total' && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-secondary">Procedimentos</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {budget.items.map((item, i) => (
              <li key={i} className="flex justify-between border-b border-border py-1">
                <span>
                  {item.quantity}x {item.description}
                  {item.tooth_number && <span className="text-text-secondary"> — dente {item.tooth_number}</span>}
                </span>
                {variant === 'completo' && <span>{formatBRL(item.quantity * item.unit_price)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {variant === 'completo' && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-secondary">Odontograma</h3>
          <OdontogramStatic records={odontogramRecords} />
        </div>
      )}

      <p className="text-right text-lg font-semibold">Total: {formatBRL(budget.total)}</p>

      <footer className="mt-8 flex flex-col items-center gap-1 border-t border-border pt-4 text-sm text-text-secondary">
        {professional && (
          <>
            <span className="border-t border-text-secondary px-8 pt-1">{professional.name}</span>
            {professional.registration_number && <span>{professional.registration_number}</span>}
          </>
        )}
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: Página de impressão**

`src/app/(print)/clientes/[id]/orcamentos/[budgetId]/imprimir/[variante]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { BudgetPrintDocument } from '@/components/orcamentos/BudgetPrintDocument'
import { PrintButton } from '@/components/orcamentos/PrintButton'
import type { BudgetItem } from '@/lib/supabase/types'

const VARIANTS = ['total', 'padrao', 'completo'] as const

export default async function ImprimirOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string; budgetId: string; variante: string }>
}) {
  const { id, budgetId, variante } = await params
  if (!VARIANTS.includes(variante as (typeof VARIANTS)[number])) notFound()
  const variant = variante as (typeof VARIANTS)[number]

  const tenant = await getCurrentTenant()
  if (!tenant) notFound()

  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: budget } = await supabase
    .from('treatment_budgets')
    .select('created_at, total, items, professional_id')
    .eq('id', budgetId)
    .single()
  if (!budget) notFound()

  let professional: { name: string; registration_number: string | null } | null = null
  if (budget.professional_id) {
    const { data: prof } = await supabase
      .from('professionals')
      .select('name, registration_number')
      .eq('id', budget.professional_id)
      .maybeSingle()
    professional = prof ?? null
  }

  let odontogramRecords: { tooth_number: string; status: import('@/lib/supabase/types').OdontogramStatus }[] = []
  if (variant === 'completo') {
    const { data: records } = await supabase
      .from('odontogram_records')
      .select('tooth_number, status')
      .eq('client_id', id)
    odontogramRecords = records ?? []
  }

  return (
    <>
      <PrintButton />
      <BudgetPrintDocument
        variant={variant}
        tenant={{ name: tenant.name, phone: tenant.phone, email: tenant.email, address: tenant.address }}
        professional={professional}
        client={client}
        budget={{ created_at: budget.created_at, total: budget.total, items: budget.items as BudgetItem[] }}
        odontogramRecords={odontogramRecords}
      />
    </>
  )
}
```

- [ ] **Step 5: Menu "Imprimir" na tela de orçamentos**

Em `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx`, adicionar links de impressão em cada orçamento listado. Trocar o bloco (dentro do `.map((b) => ...)`, logo depois do bloco de aprovar/recusar já existente da feature de orçamento parado) — adicionar, dentro do `<div key={b.id} ...>`, antes do `</div>` de fechamento do card:

```tsx
              <div className="mt-2 flex gap-3 text-xs">
                <a href={`/clientes/${id}/orcamentos/${b.id}/imprimir/total`} target="_blank" rel="noopener" className="text-accent">
                  Imprimir (só valor)
                </a>
                <a href={`/clientes/${id}/orcamentos/${b.id}/imprimir/padrao`} target="_blank" rel="noopener" className="text-accent">
                  Imprimir (padrão)
                </a>
                <a href={`/clientes/${id}/orcamentos/${b.id}/imprimir/completo`} target="_blank" rel="noopener" className="text-accent">
                  Imprimir (completo)
                </a>
              </div>
```

- [ ] **Step 6: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Verificação manual**

Run: `npm run dev`, criar um orçamento de teste, abrir as 3 URLs de impressão (`/clientes/{id}/orcamentos/{budgetId}/imprimir/total|padrao|completo`) e conferir: variante "total" só mostra valor, "padrão" mostra itens sem odontograma, "completo" mostra itens + odontograma. Botão "Imprimir" abre o diálogo nativo do navegador.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(print)" src/components/orcamentos/BudgetPrintDocument.tsx src/components/orcamentos/PrintButton.tsx "src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx"
git commit -m "feat: paginas de impressao do orcamento (3 variantes)"
```

---

## Self-Review

**Cobertura da spec:** catálogo de serviços com criação inline (Task 2 + 3), 3 variantes de PDF via impressão HTML (Task 6), odontograma na variante completa (Task 5 + 6), dados de clínica/profissional no documento (Task 4). Todos os itens do escopo aprovado estão cobertos.

**Placeholders:** nenhum TBD/TODO restante.

**Consistência de tipos:** `BudgetItem.service_id` (Task 1) usado em Task 3 (`applyService`). `Service`/`Professional` types (nome local em cada arquivo, mesmo shape) consistentes entre Task 2/3 e Task 3/6. `treatment_budgets.professional_id` (Task 1) preenchido em Task 3 (formulário) e lido em Task 6 (assinatura do PDF) — orçamento agora tem vínculo direto e correto com o profissional que o criou, sem depender de heurística de "primeiro profissional ativo". `OdontogramStatic` (Task 5) consumido com a mesma prop `records: {tooth_number, status}[]` em Task 6, igual ao `OdontogramGrid` já existente.
