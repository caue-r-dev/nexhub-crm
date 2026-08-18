# Agendamento Público — Redesign Visual + Cadastro Completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a página pública `/agendar/[slug]` pro layout do protótipo `nexhub-agendamento.jsx` (foto, cargo/registro, sobre, serviços com preço, endereço com mapa real, calendário semanal), preenchendo os campos de cadastro que faltam no schema (`professionals.photo_url`, `professionals.bio`, `procedure_types.price_label`, `tenants.latitude/longitude`) — tudo vindo do cadastro real do profissional/clínica, nada hardcoded.

**Architecture:** Aditivo em cima do que já existe — a rota `/agendar/[slug]` e o fluxo de agendamento (`BookingFlow.tsx`, `/api/public/booking/[slug]`) já funcionam e não mudam de comportamento, só a apresentação e os dados exibidos. Migração SQL nova (aditiva, sem alterar coluna existente) + 2 telas de cadastro (profissional, procedimentos) ganham campos novos + página pública é reescrita usando os dados reais.

**Tech Stack:** Next.js (App Router) + TypeScript + Supabase (Postgres/RLS) + Tailwind (tokens `bg`/`surface`/`border`/`text`/`text-secondary`/`accent` já definidos em `globals.css`) + Vitest.

## Global Constraints

- Migração é arquivo `.sql` numerado na raiz do repo (`047_...sql`), 100% aditivo (nenhuma coluna/tabela existente alterada ou removida), aplicado manualmente pelo usuário no Supabase SQL Editor — **nunca rodar migração automaticamente**.
- Sem login/autenticação de paciente na rota pública — não introduzir nenhuma.
- Sem teleconsulta em nenhuma tela ou schema.
- Convênio (Sim/Não) fica só como estado visual no formulário, igual ao protótipo — **não persiste em lugar nenhum**, não expandir pra lista de operadoras.
- Toggle de profissional só aparece quando `professionals.length > 1` (regra já existe, só preservar).
- Endereço/foto/bio/serviços vêm sempre do cadastro real (tenant/professional/procedure_types) — nunca valor fixo no componente.
- Cada tabela nova ou tocada mantém RLS por `tenant_id = auth_tenant_id()`, seguindo o padrão de todas as migrations anteriores.
- Reusar os design tokens Tailwind já usados em `BookingFlow.tsx` (`bg-surface`, `border-border`, `text-text`, `text-text-secondary`, `bg-accent`) em vez de inline styles do protótipo — é adaptação de implementação, não redesign da estrutura/layout.

---

## File Structure

- `047_agendamento_publico_visual.sql` (novo) — colunas novas em `professionals`, `procedure_types`, `tenants`.
- `src/lib/geocoding.ts` (novo) — `geocodeAddress()` puro, chama Nominatim.
- `src/lib/geocoding.test.ts` (novo) — testa `geocodeAddress` com `fetch` mockado.
- `src/lib/supabase/types.ts` (modificar) — adiciona as colunas novas nos tipos `Row`/`Insert` de `professionals`, `procedure_types`, `tenants`.
- `src/app/actions/tenant-profile.ts` (modificar) — geocoda o endereço ao salvar e grava `latitude`/`longitude`.
- `src/app/actions/professionals.ts` (modificar) — `bio` no create/update + nova `updateProfessionalPhotoAction`.
- `src/components/agenda/ProfessionalPhotoUpload.tsx` (novo) — upload de foto do profissional, espelha `ClientPhotoUpload.tsx`.
- `src/components/agenda/ProfessionalForm.tsx` (modificar) — campo `bio` (textarea "Sobre").
- `src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx` (modificar) — renderiza `ProfessionalPhotoUpload` + passa `bio` pro form.
- `src/app/actions/procedure-types.ts` (modificar) — `priceLabel` no create + nova `updateProcedureTypePriceAction`.
- `src/components/configuracoes/ProcedureTypesForm.tsx` (modificar) — campo de preço (texto livre, "R$ 150" / "A partir de R$ 480" / vazio) no form de criação e na linha de edição.
- `src/app/agendar/[slug]/page.tsx` (reescrever) — busca todos os campos novos + gera signed URL das fotos.
- `src/app/agendar/[slug]/BookingFlow.tsx` (reescrever) — layout 2 colunas do protótipo, agrupamento dos slots por dia, convênio como toggle local.

---

## Task 1: Migração SQL — colunas novas

**Files:**
- Create: `047_agendamento_publico_visual.sql`

**Interfaces:**
- Produces: `professionals.photo_url text`, `professionals.bio text`, `procedure_types.price_label text`, `tenants.latitude double precision`, `tenants.longitude double precision` — usados por todas as tasks seguintes.

- [ ] **Step 1: Escrever a migração**

```sql
-- ============================================================
-- FASE: agendamento público — redesign visual (foto, sobre,
-- registro já existentes; preço de serviço; mapa real do endereço)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- PROFESSIONALS: foto e texto "sobre" exibidos no link público
alter table professionals add column photo_url text;
alter table professionals add column bio text;

-- PROCEDURE_TYPES: preço exibido no link público — texto livre pra
-- suportar "R$ 150", "A partir de R$ 480" ou vazio (sem preço fixo),
-- cada tenant tem sua própria tabela de procedimentos já isolada por RLS.
alter table procedure_types add column price_label text;

-- TENANTS: coordenadas geocodadas automaticamente a partir do endereço
-- cadastrado, pro mapa embutido no link público usar localização real.
alter table tenants add column latitude double precision;
alter table tenants add column longitude double precision;
```

- [ ] **Step 2: Enviar o SQL acima pro usuário aplicar manualmente no Supabase Dashboard > SQL Editor** (nunca rodar migração sozinho — mesmo padrão de todas as anteriores).

- [ ] **Step 3: Commit**

```bash
git add 047_agendamento_publico_visual.sql
git commit -m "feat: colunas de foto/sobre/preco/coordenadas pro agendamento publico"
```

---

## Task 2: `geocoding.ts` — geocodificação via Nominatim

**Files:**
- Create: `src/lib/geocoding.ts`
- Test: `src/lib/geocoding.test.ts`

**Interfaces:**
- Produces: `geocodeAddress(address: string, fetchImpl?: typeof fetch): Promise<{ latitude: number; longitude: number } | null>` — usado por `src/app/actions/tenant-profile.ts` (Task 3).

- [ ] **Step 1: Escrever o teste**

```typescript
// src/lib/geocoding.test.ts
import { describe, it, expect, vi } from 'vitest'
import { geocodeAddress } from './geocoding'

describe('geocodeAddress', () => {
  it('retorna lat/lng quando a API acha o endereço', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-22.4103', lon: '-46.6844' }],
    })
    const result = await geocodeAddress('Av. Brasil, 1200, Jacutinga - MG', fetchMock as unknown as typeof fetch)
    expect(result).toEqual({ latitude: -22.4103, longitude: -46.6844 })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://nominatim.openstreetmap.org/search'),
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) })
    )
  })

  it('retorna null quando a API não acha nada', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    const result = await geocodeAddress('endereço inexistente', fetchMock as unknown as typeof fetch)
    expect(result).toBeNull()
  })

  it('retorna null quando a chamada falha (nunca lança)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('timeout'))
    const result = await geocodeAddress('Av. Brasil, 1200', fetchMock as unknown as typeof fetch)
    expect(result).toBeNull()
  })

  it('retorna null pra endereço vazio sem chamar a API', async () => {
    const fetchMock = vi.fn()
    const result = await geocodeAddress('   ', fetchMock as unknown as typeof fetch)
    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/lib/geocoding.test.ts`
Expected: FAIL com "Cannot find module './geocoding'" ou similar.

- [ ] **Step 3: Implementar**

```typescript
// src/lib/geocoding.ts

// Geocoding gratuito via Nominatim/OpenStreetMap — sem API key. Uso da
// API exige um User-Agent identificável (política de uso do Nominatim);
// best-effort: qualquer falha (rede, endereço não encontrado) retorna
// null em vez de lançar, pra nunca travar o salvamento do cadastro.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'NexHub CRM (contato@nexvix.com.br)'

export async function geocodeAddress(
  address: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`
    const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null

    const results = (await res.json()) as Array<{ lat: string; lon: string }>
    const first = results[0]
    if (!first) return null

    return { latitude: Number(first.lat), longitude: Number(first.lon) }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/lib/geocoding.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geocoding.ts src/lib/geocoding.test.ts
git commit -m "feat: geocodeAddress via Nominatim, best-effort sem API key"
```

---

## Task 3: Geocodar endereço ao salvar cadastro da clínica

**Files:**
- Modify: `src/app/actions/tenant-profile.ts`
- Modify: `src/lib/supabase/types.ts` (linhas 69-116, bloco `tenants`)

**Interfaces:**
- Consumes: `geocodeAddress(address: string): Promise<{ latitude, longitude } | null>` (Task 2).
- Produces: `tenants.latitude`/`tenants.longitude` atualizados sempre que o endereço muda — consumido pela Task 8 (`page.tsx` do link público).

- [ ] **Step 1: Adicionar `latitude`/`longitude` em `Row`, `Insert` de `tenants` em `types.ts`**

Em `src/lib/supabase/types.ts`, dentro do bloco `tenants` (`Row`, linha ~115, e `Insert`, próximo ao final do bloco `Insert` de tenants), adicionar:

```typescript
          latitude: number | null
          longitude: number | null
```

(em `Insert`, como `latitude?: number | null` / `longitude?: number | null`).

- [ ] **Step 2: Modificar `updateClinicProfileAction` pra geocodar quando o endereço muda**

```typescript
// src/app/actions/tenant-profile.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { geocodeAddress } from '@/lib/geocoding'

export async function updateClinicProfileAction(input: {
  phone: string
  email: string
  address: string
  cnpj: string
  socialMedia: string
  websiteUrl: string
}) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const trimmedAddress = input.address.trim() || null

  // Só geocoda de novo quando o endereço mudou — evita bater na API do
  // Nominatim toda vez que o usuário salva telefone/e-mail sem mexer no
  // endereço. Falha na geocodificação não bloqueia o salvamento: o mapa
  // no link público só não aparece até o endereço geocodificar com sucesso.
  let latitude = tenant.latitude
  let longitude = tenant.longitude
  if (trimmedAddress !== tenant.address) {
    const coords = trimmedAddress ? await geocodeAddress(trimmedAddress) : null
    latitude = coords?.latitude ?? null
    longitude = coords?.longitude ?? null
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      address: trimmedAddress,
      cnpj: input.cnpj.trim() || null,
      social_media: input.socialMedia.trim() || null,
      website_url: input.websiteUrl.trim() || null,
      latitude,
      longitude,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/clinica')
}
```

- [ ] **Step 3: Rodar a suíte inteira pra garantir que nada quebrou**

Run: `npm run test`
Expected: PASS (sem regressão nos testes existentes).

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/tenant-profile.ts src/lib/supabase/types.ts
git commit -m "feat: geocoda endereco da clinica ao salvar cadastro"
```

---

## Task 4: Preço de serviço em `procedure_types`

**Files:**
- Modify: `src/app/actions/procedure-types.ts`
- Modify: `src/components/configuracoes/ProcedureTypesForm.tsx`
- Modify: `src/app/(dashboard)/configuracoes/procedimentos/page.tsx`
- Modify: `src/lib/supabase/types.ts` (bloco `procedure_types`, linhas 689-717)

**Interfaces:**
- Produces: `procedure_types.price_label` populável — consumido pela Task 8 (`page.tsx` do link público, lista "Serviços e preços").

- [ ] **Step 1: Adicionar `price_label` em `types.ts`**

No bloco `procedure_types` (`Row` e `Insert`), adicionar `price_label: string | null` (e `price_label?: string | null` em `Insert`).

- [ ] **Step 2: Adicionar `priceLabel` na criação e uma action de update**

```typescript
// src/app/actions/procedure-types.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createProcedureTypeAction(name: string, defaultDurationMin?: number, priceLabel?: string) {
  if (!name.trim()) return { error: 'Informe um nome.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('procedure_types').insert({
    tenant_id: tenant.id,
    name: name.trim(),
    default_duration_min: defaultDurationMin || null,
    price_label: priceLabel?.trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function toggleProcedureTypeAction(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('procedure_types').update({ active }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function updateProcedureTypeDurationAction(id: string, defaultDurationMin: number | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('procedure_types')
    .update({ default_duration_min: defaultDurationMin })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function updateProcedureTypeProtocolAction(id: string, protocol: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('procedure_types')
    .update({ protocol: protocol.trim() || null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function updateProcedureTypePriceLabelAction(id: string, priceLabel: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('procedure_types')
    .update({ price_label: priceLabel.trim() || null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}
```

- [ ] **Step 3: Passar `price_label` na query da página**

Em `src/app/(dashboard)/configuracoes/procedimentos/page.tsx`, trocar o `.select(...)`:

```typescript
  const { data: procedureTypes } = tenant
    ? await supabase
        .from('procedure_types')
        .select('id, name, active, default_duration_min, protocol, price_label')
        .eq('tenant_id', tenant.id)
        .order('name')
    : { data: [] }
```

- [ ] **Step 4: Adicionar campo de preço no form e na linha de edição**

```typescript
// src/components/configuracoes/ProcedureTypesForm.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  createProcedureTypeAction,
  toggleProcedureTypeAction,
  updateProcedureTypeDurationAction,
  updateProcedureTypeProtocolAction,
  updateProcedureTypePriceLabelAction,
} from '@/app/actions/procedure-types'

type ProcedureType = {
  id: string
  name: string
  active: boolean
  default_duration_min: number | null
  protocol: string | null
  price_label: string | null
}

export function ProcedureTypesForm({ initial }: { initial: ProcedureType[] }) {
  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [priceLabel, setPriceLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProcedureTypeAction(name, Number(durationMin) || undefined, priceLabel)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setDurationMin('')
        setPriceLabel('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Novo procedimento</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Limpeza"
            />
          </label>
          <label className="flex w-28 flex-col gap-1">
            <span className="text-sm font-medium text-text">Duração (min)</span>
            <input
              type="number"
              min={5}
              step={5}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="30"
            />
          </label>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Preço (opcional)</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              placeholder="Ex: R$ 150 ou A partir de R$ 480"
            />
            <span className="text-xs text-text-secondary">Aparece no link público de agendamento. Deixe em branco pra não mostrar preço.</span>
          </label>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {initial.map((p) => (
          <ProcedureRow key={p.id} procedure={p} />
        ))}
      </div>
    </div>
  )
}

function ProcedureRow({ procedure }: { procedure: ProcedureType }) {
  const [showProtocol, setShowProtocol] = useState(false)
  const [protocol, setProtocol] = useState(procedure.protocol ?? '')
  const [priceLabel, setPriceLabel] = useState(procedure.price_label ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function saveProtocol() {
    if (protocol === (procedure.protocol ?? '')) return
    startTransition(async () => {
      await updateProcedureTypeProtocolAction(procedure.id, protocol)
      setSaved(true)
    })
  }

  function savePriceLabel() {
    if (priceLabel === (procedure.price_label ?? '')) return
    startTransition(async () => {
      await updateProcedureTypePriceLabelAction(procedure.id, priceLabel)
    })
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text">{procedure.name}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProtocol((v) => !v)}
            className="text-xs font-medium text-accent"
          >
            {procedure.protocol ? 'Protocolo' : '+ Protocolo'}
          </button>
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={5}
              step={5}
              defaultValue={procedure.default_duration_min ?? ''}
              placeholder="Padrão"
              className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
              onBlur={(e) => {
                const value = e.target.value ? Number(e.target.value) : null
                if (value === procedure.default_duration_min) return
                startTransition(async () => {
                  await updateProcedureTypeDurationAction(procedure.id, value)
                })
              }}
            />
            <span className="text-xs text-text-secondary">min</span>
          </label>
          <input
            type="checkbox"
            checked={procedure.active}
            onChange={(e) =>
              startTransition(async () => {
                await toggleProcedureTypeAction(procedure.id, e.target.checked)
              })
            }
          />
        </div>
      </div>

      <input
        value={priceLabel}
        onChange={(e) => setPriceLabel(e.target.value)}
        onBlur={savePriceLabel}
        placeholder="Preço (opcional) — Ex: R$ 150"
        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
      />

      {showProtocol && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border p-2">
          <span className="text-xs text-text-secondary">
            Protocolo padrão — o profissional lê/ajusta na hora do atendimento.
          </span>
          <textarea
            rows={3}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
            value={protocol}
            onChange={(e) => {
              setProtocol(e.target.value)
              setSaved(false)
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveProtocol}
              disabled={isPending}
              className="self-start rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              {isPending ? 'Salvando...' : 'Salvar protocolo'}
            </button>
            {saved && !isPending && <span className="text-xs text-status-confirmed">Salvo.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Rodar a suíte**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/procedure-types.ts src/components/configuracoes/ProcedureTypesForm.tsx \
  "src/app/(dashboard)/configuracoes/procedimentos/page.tsx" src/lib/supabase/types.ts
git commit -m "feat: preco opcional por procedimento, exibido no link publico"
```

---

## Task 5: Foto e "sobre" do profissional

**Files:**
- Modify: `src/app/actions/professionals.ts`
- Create: `src/components/agenda/ProfessionalPhotoUpload.tsx`
- Modify: `src/components/agenda/ProfessionalForm.tsx`
- Modify: `src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx`
- Modify: `src/lib/supabase/types.ts` (bloco `professionals`, linhas 596-626)

**Interfaces:**
- Consumes: padrão de upload de `src/components/clientes/ClientPhotoUpload.tsx` (bucket `client-files`, `createSignedUrl`).
- Produces: `professionals.photo_url` (path no bucket `client-files`, não URL pública), `professionals.bio` — consumidos pela Task 8.

- [ ] **Step 1: Adicionar `photo_url`/`bio` em `types.ts`**

No bloco `professionals` (`Row` e `Insert`), adicionar `photo_url: string | null` e `bio: string | null` (opcionais em `Insert`).

- [ ] **Step 2: Adicionar `bio` no create/update e nova action de foto**

```typescript
// src/app/actions/professionals.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { BusinessHours } from '@/lib/supabase/types'

export type ProfessionalInput = {
  name: string
  color: string
  active?: boolean
  registrationNumber?: string
  role?: string
  bio?: string
}

const WEEKDAY_NUMBERS: Record<keyof BusinessHours, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export async function createProfessionalAction(input: ProfessionalInput) {
  if (!input.name.trim()) return { error: 'Nome é obrigatório.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data: professional, error } = await supabase
    .from('professionals')
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      color: input.color,
      registration_number: input.registrationNumber?.trim() || null,
      role: input.role?.trim() || null,
      bio: input.bio?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !professional) return { error: error?.message ?? 'Não foi possível criar o profissional.' }

  const { data: tenantRow } = await supabase.from('tenants').select('business_hours').eq('id', tenant.id).single()
  const businessHours = tenantRow?.business_hours as BusinessHours | null
  if (businessHours) {
    const rows = (Object.keys(WEEKDAY_NUMBERS) as (keyof BusinessHours)[])
      .filter((day) => businessHours[day]?.active)
      .map((day) => ({
        tenant_id: tenant.id,
        professional_id: professional.id,
        weekday: WEEKDAY_NUMBERS[day],
        start_time: businessHours[day].start,
        end_time: businessHours[day].end,
      }))
    if (rows.length > 0) {
      await supabase.from('professional_hours').insert(rows)
    }
  }

  revalidatePath('/agenda')
  redirect('/agenda')
}

export async function updateProfessionalAction(id: string, input: ProfessionalInput) {
  if (!input.name.trim()) return { error: 'Nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('professionals')
    .update({
      name: input.name.trim(),
      color: input.color,
      active: input.active ?? true,
      registration_number: input.registrationNumber?.trim() || null,
      role: input.role?.trim() || null,
      bio: input.bio?.trim() || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/agenda')
  redirect('/agenda')
}

export async function updateProfessionalPhotoAction(id: string, photoPath: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.from('professionals').update({ photo_url: photoPath }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/agenda/profissionais/${id}/editar`)
}
```

- [ ] **Step 3: Criar `ProfessionalPhotoUpload.tsx` (espelha `ClientPhotoUpload.tsx`)**

```typescript
// src/components/agenda/ProfessionalPhotoUpload.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfessionalPhotoAction } from '@/app/actions/professionals'

export function ProfessionalPhotoUpload({
  professionalId,
  tenantId,
  initialPhotoPath,
  initials,
}: {
  professionalId: string
  tenantId: string
  initialPhotoPath: string | null
  initials: string
}) {
  const [photoPath, setPhotoPath] = useState(initialPhotoPath)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photoPath) {
      setPhotoUrl(null)
      return
    }
    const supabase = createClient()
    supabase.storage
      .from('client-files')
      .createSignedUrl(photoPath, 3600)
      .then(({ data }) => setPhotoUrl(data?.signedUrl ?? null))
  }, [photoPath])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${tenantId}/professionals/${professionalId}/foto-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('client-files').upload(path, file, {
      contentType: file.type,
    })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const oldPath = photoPath
    const result = await updateProfessionalPhotoAction(professionalId, path)
    setUploading(false)

    if (result && 'error' in result) {
      setError(result.error ?? null)
      await supabase.storage.from('client-files').remove([path])
      return
    }

    setPhotoPath(path)
    if (oldPath) await supabase.storage.from('client-files').remove([oldPath])
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-lg font-semibold text-text-secondary disabled:opacity-40"
        title="Trocar foto"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="self-start text-sm font-medium text-accent disabled:opacity-40"
        >
          {uploading ? 'Enviando...' : photoPath ? 'Trocar foto' : '+ Adicionar foto'}
        </button>
        {error && <p className="text-xs text-status-cancelled">{error}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
```

- [ ] **Step 4: Adicionar campo "Sobre" em `ProfessionalForm.tsx`**

Em `src/components/agenda/ProfessionalForm.tsx`: adicionar `bio` ao tipo `initial`, ao `useState`, ao objeto passado nas duas actions, e um `<textarea>` logo após o campo "Especialidade":

```typescript
  initial?: { name: string; color: string; active: boolean; registrationNumber?: string; role?: string; bio?: string }
```
```typescript
  const [bio, setBio] = useState(initial?.bio ?? '')
```
```typescript
      const result = professionalId
        ? await updateProfessionalAction(professionalId, { name, color, active, registrationNumber, role, bio })
        : await createProfessionalAction({ name, color, registrationNumber, role, bio })
```
```tsx
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Sobre (opcional)</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Texto curto sobre você, exibido no link público de agendamento."
        />
      </label>
```

- [ ] **Step 5: Renderizar `ProfessionalPhotoUpload` na página de edição**

```typescript
// src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { ProfessionalForm } from '@/components/agenda/ProfessionalForm'
import { ProfessionalPhotoUpload } from '@/components/agenda/ProfessionalPhotoUpload'
import { ProfessionalHoursForm } from '@/components/agenda/ProfessionalHoursForm'
import { ProcedureDurationsForm } from '@/components/agenda/ProcedureDurationsForm'
import { initials } from '@/lib/professional-colors'

export default async function EditarProfissionalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: professional } = await supabase.from('professionals').select('*').eq('id', id).single()
  if (!professional) notFound()

  const { data: hours } = await supabase
    .from('professional_hours')
    .select('weekday, start_time, end_time')
    .eq('professional_id', id)

  const tenant = await getCurrentTenant()
  const [{ data: procedureTypes }, { data: durationOverrides }] = await Promise.all([
    tenant
      ? supabase.from('procedure_types').select('id, name, default_duration_min').eq('tenant_id', tenant.id).eq('active', true).order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('professional_procedure_durations').select('procedure_type_id, duration_min').eq('professional_id', id),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-text">Editar profissional</h1>
        {tenant && (
          <ProfessionalPhotoUpload
            professionalId={professional.id}
            tenantId={tenant.id}
            initialPhotoPath={professional.photo_url}
            initials={initials(professional.name)}
          />
        )}
        <ProfessionalForm
          professionalId={professional.id}
          initial={{
            name: professional.name,
            color: professional.color,
            active: professional.active,
            registrationNumber: professional.registration_number ?? undefined,
            role: professional.role ?? undefined,
            bio: professional.bio ?? undefined,
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Horário de trabalho</h2>
          <p className="text-text-secondary">Usado pra calcular horários livres no link público de agendamento.</p>
        </div>
        <ProfessionalHoursForm professionalId={professional.id} existing={hours ?? []} />
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Duração por procedimento</h2>
          <p className="text-text-secondary">
            Sobrescreve a duração padrão do procedimento só pra este profissional. Deixe em branco pra
            usar o padrão.
          </p>
        </div>
        <ProcedureDurationsForm
          professionalId={professional.id}
          procedureTypes={procedureTypes ?? []}
          overrides={durationOverrides ?? []}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Rodar a suíte**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/actions/professionals.ts src/components/agenda/ProfessionalPhotoUpload.tsx \
  src/components/agenda/ProfessionalForm.tsx \
  "src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx" src/lib/supabase/types.ts
git commit -m "feat: foto e texto sobre do profissional, exibidos no link publico"
```

---

## Task 6: Redesign de `src/app/agendar/[slug]/page.tsx`

**Files:**
- Modify: `src/app/agendar/[slug]/page.tsx`

**Interfaces:**
- Consumes: `professionals.photo_url/bio/role/registration_number` (Task 5), `procedure_types.price_label` (Task 4), `tenants.address/latitude/longitude` (Task 3).
- Produces: props novas pra `BookingFlow` (Task 7) — `professionals: ProfessionalProfile[]`, `procedureTypes: ProcedureTypeWithPrice[]`, `clinic: { name, address, latitude, longitude }`.

- [ ] **Step 1: Reescrever a página buscando os campos novos e gerando signed URL das fotos**

```typescript
// src/app/agendar/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingFlow } from './BookingFlow'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slug, public_booking_enabled, niche_id, address, latitude, longitude')
    .eq('slug', slug)
    .single()
  if (!tenant) notFound()

  const { data: niche } = await admin.from('niches').select('slug').eq('id', tenant.niche_id).single()
  const terms = nicheTermsFor(niche?.slug ?? null)

  if (!tenant.public_booking_enabled) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold text-text">{tenant.name}</h1>
        <p className="text-text-secondary">
          Agendamento pelo site está desativado no momento. Fale com a gente pelo WhatsApp pra marcar {terms.bookingWordArticle} {terms.bookingWord}.
        </p>
      </div>
    )
  }

  const { data: professionalsRaw } = await admin
    .from('professionals')
    .select('id, name, role, registration_number, photo_url, bio')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  // Signed URL da foto gerada no servidor (admin client) porque a página
  // pública não tem sessão autenticada pra pedir signed URL do lado do
  // cliente — o bucket client-files é privado.
  const professionals = await Promise.all(
    (professionalsRaw ?? []).map(async (p) => {
      let photoUrl: string | null = null
      if (p.photo_url) {
        const { data: signed } = await admin.storage.from('client-files').createSignedUrl(p.photo_url, 3600)
        photoUrl = signed?.signedUrl ?? null
      }
      return {
        id: p.id,
        name: p.name,
        role: p.role,
        registrationNumber: p.registration_number,
        bio: p.bio,
        photoUrl,
      }
    })
  )

  const { data: procedureTypes } = await admin
    .from('procedure_types')
    .select('id, name, price_label')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  return (
    <BookingFlow
      slug={slug}
      clinicName={tenant.name}
      professionals={professionals}
      procedureTypes={procedureTypes ?? []}
      address={tenant.address}
      latitude={tenant.latitude}
      longitude={tenant.longitude}
      nicheSlug={niche?.slug ?? null}
    />
  )
}
```

- [ ] **Step 2: Rodar `npm run build` pra pegar erro de tipo cedo (a Task 7 ainda não mudou a assinatura de `BookingFlow` — esse passo só confirma que a query/admin client compilam; o erro de props esperado de `BookingFlow` é tratado na Task 7)**

Run: `npx tsc --noEmit`
Expected: erro apontando pra `BookingFlow` não aceitar essas props ainda — confirma que Task 7 é o próximo passo obrigatório antes de considerar isso pronto.

- [ ] **Step 3: Commit** (junto com a Task 7 — ver Step final da Task 7; não commitar isoladamente pra não deixar o build quebrado no meio do histórico)

---

## Task 7: Redesign de `BookingFlow.tsx` — layout do protótipo

**Files:**
- Modify: `src/app/agendar/[slug]/BookingFlow.tsx`

**Interfaces:**
- Consumes: props novas da Task 6 (`clinicName`, `professionals: ProfessionalProfile[]`, `procedureTypes: {id,name,price_label}[]`, `address`, `latitude`, `longitude`).
- Produces: nenhuma interface nova pra fora — é a folha da árvore de componentes dessa feature.

- [ ] **Step 1: Reescrever o componente com layout 2 colunas (perfil + agendamento), reaproveitando 100% da lógica de fetch/submit já existente**

```typescript
// src/app/agendar/[slug]/BookingFlow.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAnamneseQuestions, type AnamneseQuestionnaire } from '@/lib/anamnese-questions'
import { ANAMNESE_EVOLUCOES_NICHES } from '@/lib/niche-features'
import { nicheTermsFor } from '@/lib/niche-terms'
import { initials } from '@/lib/professional-colors'

type ProfessionalProfile = {
  id: string
  name: string
  role: string | null
  registrationNumber: string | null
  bio: string | null
  photoUrl: string | null
}
type ProcedureType = { id: string; name: string; price_label: string | null }

const EMPTY_ANAMNESE: AnamneseQuestionnaire = { queixa_principal: '', answers: {} }

// Transforma a lista plana de slots ISO (o que a API já retorna) num
// calendário semanal (um card por dia) igual ao protótipo — puramente
// visual, a API de disponibilidade não muda. Dia da semana e data são
// derivados os dois via Intl no fuso America/Sao_Paulo — usar
// Date.getDay()/getUTCDay() aqui erra o dia sempre que o navegador de
// quem acessa o link está em outro fuso (paciente fora do Brasil, por
// exemplo), porque eles usam o fuso local da máquina, não o do negócio.
function groupSlotsByDay(slots: string[]) {
  const byDay = new Map<string, { label: string; date: string; slots: string[] }>()
  for (const slot of slots) {
    const d = new Date(slot)
    const dayKey = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const label = d
      .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' })
      .replace(/^\w/, (c) => c.toUpperCase())
    const dateLabel = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
    if (!byDay.has(dayKey)) byDay.set(dayKey, { label, date: dateLabel, slots: [] })
    byDay.get(dayKey)!.slots.push(slot)
  }
  return Array.from(byDay.values())
}

export function BookingFlow({
  slug,
  clinicName,
  professionals,
  procedureTypes,
  address,
  latitude,
  longitude,
  nicheSlug,
}: {
  slug: string
  clinicName: string
  professionals: ProfessionalProfile[]
  procedureTypes: ProcedureType[]
  address: string | null
  latitude: number | null
  longitude: number | null
  nicheSlug: string | null
}) {
  const terms = nicheTermsFor(nicheSlug)
  const ANAMNESE_QUESTIONS = getAnamneseQuestions(nicheSlug)
  const showAnamnese = !!nicheSlug && ANAMNESE_EVOLUCOES_NICHES.has(nicheSlug)
  const temMaisDeUmProfissional = professionals.length > 1

  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? '')
  const [procedureTypeId, setProcedureTypeId] = useState('')
  const [convenio, setConvenio] = useState<'sim' | 'nao'>('nao')
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [document, setDocumentValue] = useState('')
  const [phone, setPhone] = useState('')
  const [anamnese, setAnamnese] = useState<AnamneseQuestionnaire>(EMPTY_ANAMNESE)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const professionalAtual = professionals.find((p) => p.id === professionalId) ?? professionals[0]
  const dias = useMemo(() => groupSlotsByDay(slots), [slots])

  useEffect(() => {
    setSlots([])
    setSelectedSlot(null)

    if (!professionalId || !procedureTypeId) return

    setLoadingSlots(true)
    fetch(`/api/public/booking/${slug}/availability?professionalId=${professionalId}&procedureTypeId=${procedureTypeId}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }, [professionalId, procedureTypeId, slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!professionalId || !procedureTypeId || !selectedSlot || !name.trim() || !phone.trim()) {
      setError('Preencha todos os campos e escolha um horário.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/booking/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId,
          procedureTypeId,
          datetime: selectedSlot,
          patientName: name,
          patientDocument: document,
          patientPhone: phone,
          anamnese,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao agendar.')
        if (res.status === 409) {
          setSlots((prev) => prev.filter((s) => s !== selectedSlot))
          setSelectedSlot(null)
        }
        return
      }
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <p className="text-lg font-medium text-text">Agendamento reservado!</p>
        <p className="text-text-secondary">
          Te mandamos o Pix do sinal por WhatsApp. Pague pra confirmar seu horário.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-text-secondary">
          <span className="font-bold text-accent">NexHub</span>
          <span>·</span>
          <span>Agendamento online</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1.4fr_1fr] md:items-start md:px-6">
        {/* COLUNA ESQUERDA - PERFIL */}
        <div className="rounded-xl border border-border bg-surface p-6">
          {professionalAtual && (
            <div className="flex items-center gap-4">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-2xl font-bold text-accent">
                {professionalAtual.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={professionalAtual.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(professionalAtual.name)
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-text">{professionalAtual.name}</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {[professionalAtual.role, professionalAtual.registrationNumber].filter(Boolean).join(' · ')}
                </p>
                {address && <p className="text-sm text-text-secondary">{address}</p>}
              </div>
            </div>
          )}

          {professionalAtual?.bio && (
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="mb-2 text-sm font-bold text-text">Sobre</h2>
              <p className="text-sm leading-relaxed text-text-secondary">{professionalAtual.bio}</p>
            </div>
          )}

          {procedureTypes.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <h2 className="mb-3 text-sm font-bold text-text">Serviços e preços</h2>
              {procedureTypes.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-text">{p.name}</p>
                    {p.price_label && <p className="mt-0.5 text-xs text-text-secondary">{p.price_label}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProcedureTypeId(p.id)}
                    className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Agendar
                  </button>
                </div>
              ))}
            </div>
          )}

          {address && (
            <div className="mt-5 border-t border-border pt-5">
              <h2 className="mb-3 text-sm font-bold text-text">Endereço</h2>
              <p className="mb-3 text-sm text-text-secondary">{address}</p>
              {latitude != null && longitude != null && (
                <iframe
                  title="Localização"
                  width="100%"
                  height="180"
                  style={{ border: 0 }}
                  className="rounded-lg"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                />
              )}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA - AGENDAMENTO */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:sticky md:top-6">
          <h2 className="text-base font-bold text-text">Agendar atendimento</h2>

          {temMaisDeUmProfissional && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-secondary">Profissional</span>
              <select
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-secondary">Procedimento</span>
            <select
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={procedureTypeId}
              onChange={(e) => setProcedureTypeId(e.target.value)}
            >
              <option value="">Selecione</option>
              {procedureTypes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">Tem convênio?</span>
            <div className="flex gap-2">
              {(['sim', 'nao'] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setConvenio(op)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                    convenio === op ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'
                  }`}
                >
                  {op === 'sim' ? 'Sim' : 'Não'}
                </button>
              ))}
            </div>
          </div>

          {professionalId && procedureTypeId && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-text-secondary">Horário</span>
              {loadingSlots && <p className="text-sm text-text-secondary">Carregando horários...</p>}
              {!loadingSlots && dias.length === 0 && (
                <p className="text-sm text-text-secondary">Nenhum horário disponível nas próximas semanas.</p>
              )}
              {dias.length > 0 && (
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${dias.length}, 1fr)` }}>
                  {dias.map((dia) => (
                    <div key={dia.date} className="text-center">
                      <p className="mb-0.5 text-[11px] font-bold text-text">{dia.label}</p>
                      <p className="mb-2 text-[10px] text-text-secondary">{dia.date}</p>
                      {dia.slots.map((slot) => {
                        const label = new Date(slot).toLocaleTimeString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        const isSelected = selectedSlot === slot
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`mb-1.5 block w-full rounded-md border px-0.5 py-1.5 text-[11px] font-semibold ${
                              isSelected ? 'border-accent bg-accent text-white' : 'border-border bg-bg text-text'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <>
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text">Nome completo</span>
                  <input
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text">CPF</span>
                  <input
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                    value={document}
                    onChange={(e) => setDocumentValue(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                  <span className="text-xs text-text-secondary">
                    Demais dados são coletados {terms.businessWordIn} {terms.businessWord}.
                  </span>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text">Seu WhatsApp</span>
                  <input
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </label>
              </div>

              {showAnamnese && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <h2 className="text-sm font-semibold text-text">
                    {nicheSlug === 'advogado' ? 'Sobre o caso (opcional)' : 'Ficha de saúde (opcional)'}
                  </h2>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-text">
                      {nicheSlug === 'advogado' ? 'Resuma o caso' : 'O que você está sentindo?'}
                    </span>
                    <textarea
                      rows={2}
                      className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                      value={anamnese.queixa_principal}
                      onChange={(e) => setAnamnese((prev) => ({ ...prev, queixa_principal: e.target.value }))}
                    />
                  </label>

                  <details className="rounded-lg border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-text">
                      {nicheSlug === 'advogado' ? 'Perguntas sobre o caso' : 'Perguntas de saúde (ajuda o profissional a te atender melhor)'}
                    </summary>
                    <div className="flex flex-col divide-y divide-border border-t border-border">
                      {ANAMNESE_QUESTIONS.map((q) => {
                        const answer = anamnese.answers[q.id]
                        return (
                          <div key={q.id} className="flex flex-col gap-2 px-3 py-3">
                            <p className="text-sm text-text">{q.label}</p>
                            <div className="flex gap-4">
                              {(['sim', 'nao', 'nao_sei'] as const).map((opt) => (
                                <label key={opt} className="flex items-center gap-1.5 text-sm text-text">
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={answer?.value === opt}
                                    onChange={() =>
                                      setAnamnese((prev) => ({
                                        ...prev,
                                        answers: { ...prev.answers, [q.id]: { ...prev.answers[q.id], value: opt } },
                                      }))
                                    }
                                  />
                                  {opt === 'sim' ? 'Sim' : opt === 'nao' ? 'Não' : 'Não sei'}
                                </label>
                              ))}
                            </div>
                            {q.hasInfo && (
                              <input
                                placeholder="Informações adicionais"
                                className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
                                value={answer?.info ?? ''}
                                onChange={(e) =>
                                  setAnamnese((prev) => ({
                                    ...prev,
                                    answers: { ...prev.answers, [q.id]: { value: prev.answers[q.id]?.value ?? '', info: e.target.value } },
                                  }))
                                }
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </div>
              )}

              {error && <p className="text-sm text-status-cancelled">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-40"
              >
                {submitting ? 'Agendando...' : 'Confirmar agendamento'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar type-check e suíte**

Run: `npx tsc --noEmit && npm run test`
Expected: PASS (agora que `page.tsx` e `BookingFlow.tsx` batem nas props).

- [ ] **Step 3: Commit (fecha Task 6 + Task 7 juntas, único ponto em que o build fica verde)**

```bash
git add "src/app/agendar/[slug]/page.tsx" "src/app/agendar/[slug]/BookingFlow.tsx"
git commit -m "feat: redesign do link publico de agendamento no layout do prototipo"
```

---

## Task 8: Validação manual no navegador (checkpoint obrigatório)

Conforme o `task_plan_agendamento.md`: **nenhuma tarefa é considerada concluída sem teste real na tela pelo Cauê.**

- [ ] **Step 1: Rodar o dev server**

Run: `npm run dev`

- [ ] **Step 2: No painel, cadastrar em um tenant de teste:** foto + "sobre" de pelo menos 1 profissional (`/agenda/profissionais/[id]/editar`), preço em pelo menos 1 procedimento (`/configuracoes/procedimentos`), endereço (`/configuracoes/clinica`) e conferir que `latitude`/`longitude` foram preenchidos no Supabase depois de salvar.

- [ ] **Step 3: Abrir `/agendar/[slug]` no navegador e conferir:**
  - Foto, cargo/registro, sobre, serviços com preço e endereço aparecem exatamente com o dado cadastrado (não hardcoded).
  - Mapa embutido mostra o pino no endereço real cadastrado.
  - Toggle de profissional só aparece se o tenant de teste tiver mais de 1 profissional ativo; trocar o profissional recarrega os horários.
  - Nenhuma opção de teleconsulta em lugar nenhum.
  - Fluxo completo de agendamento (escolher serviço → horário → dados → confirmar) ainda funciona ponta a ponta.

- [ ] **Step 4: Reportar ao Cauê pra validação final antes de considerar a feature "done".**
