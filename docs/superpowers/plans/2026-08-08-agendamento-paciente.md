# Agendamento pelo próprio paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paciente agenda consulta sozinho via `/agendar/{slug}`, vendo só horários realmente livres do profissional escolhido, recebe Pix do sinal automático por WhatsApp, e a clínica é notificada — sem a secretária precisar checar a agenda pra marcar o horário.

**Architecture:** Nova tabela `professional_hours` (horário de trabalho por profissional/dia da semana) alimenta um cálculo puro de slots livres (`src/lib/availability.ts`), consumido tanto por uma rota pública de disponibilidade quanto pela página `/agendar/[slug]`. O submit cria `clients`+`appointments` (status `pending`, `source='public_booking'`) e reusa a função `confirmAppointment` já existente (`src/lib/appointment-automation.ts`) pra marcar `status='confirmed'`, mandar a mensagem de confirmação e o Pix do sinal — nenhuma lógica de envio de Pix é duplicada. Reservas com sinal pendente expiram sozinhas via um novo endpoint de cron que reusa `cancelAppointment`.

**Tech Stack:** Next.js 16 (App Router, server actions + route handlers), Supabase (Postgres + RLS, service role pra rotas públicas), TypeScript, Tailwind. Vitest é introduzido nesta plan (projeto não tinha framework de teste antes) só pra lógica pura de disponibilidade.

## Global Constraints

- Migrations SQL neste projeto são aplicadas manualmente via Supabase Dashboard > SQL Editor (não há CLI de migration configurada) — cada task de schema entrega um arquivo `.sql` numerado na raiz do repo, seguindo o padrão dos arquivos `001_...` a `010_...` já existentes.
- `src/lib/supabase/types.ts` é mantido manualmente (comentário no topo do arquivo confirma: sem geração automática) — toda migration precisa de um update manual correspondente nesse arquivo, na mesma task.
- Rotas públicas (sem sessão) usam sempre `createAdminClient()` (service role, bypassa RLS), nunca `createClient()` — padrão já usado em `src/app/api/automations/*`.
- Telefone BR é normalizado com `normalizePhone` de `src/lib/evolution.ts` antes de qualquer envio ou comparação.
- Reusar `confirmAppointment`/`cancelAppointment` de `src/lib/appointment-automation.ts` em vez de reimplementar envio de Pix/WhatsApp — essas funções já cobrem geração de Pix, mensagens e tratamento de erro de WhatsApp fora do ar.
- Spec de referência: `docs/superpowers/specs/2026-08-08-agendamento-paciente-design.md`.

---

## Task 1: Migration de schema

**Files:**
- Create: `011_agendamento_publico.sql`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: colunas `tenants.slug`, `tenants.notification_phone`, `tenants.slot_duration_minutes`, `tenants.buffer_minutes`, `tenants.booking_hold_minutes`; tabelas `professional_hours` e `procedure_types`; colunas `appointments.source`, `appointments.booking_expires_at`. Tipos TS: `Database['public']['Tables']['professional_hours']`, `Database['public']['Tables']['procedure_types']`, campos novos em `tenants`/`appointments` Row/Insert/Update.

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- ============================================================
-- FASE: agendamento público pelo paciente (self-service booking)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- TENANTS: link público + notificação + regras de slot/sinal
alter table tenants add column slug text unique;
alter table tenants add column notification_phone text;
alter table tenants add column slot_duration_minutes integer not null default 30;
alter table tenants add column buffer_minutes integer not null default 0;
alter table tenants add column booking_hold_minutes integer not null default 120;

-- PROFESSIONAL_HOURS: horário de trabalho individual por profissional/dia da semana
create table professional_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  professional_id uuid not null references professionals(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint professional_hours_valid_range check (start_time < end_time)
);

create index idx_professional_hours_professional on professional_hours(professional_id);

alter table professional_hours enable row level security;
create policy "professional_hours isolation - all" on professional_hours
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- PROCEDURE_TYPES: lista de procedimentos que o paciente escolhe no link público
create table procedure_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_procedure_types_tenant on procedure_types(tenant_id);

alter table procedure_types enable row level security;
create policy "procedure_types isolation - all" on procedure_types
  for all using (tenant_id = auth_tenant_id()) with check (tenant_id = auth_tenant_id());

-- APPOINTMENTS: origem do agendamento + expiração de reserva não paga
alter table appointments add column source text not null default 'internal';
alter table appointments add column booking_expires_at timestamptz;
```

- [ ] **Step 2: Aplicar manualmente no Supabase Dashboard > SQL Editor** (colar o conteúdo do arquivo e rodar). Confirmar sem erro.

- [ ] **Step 3: Atualizar `src/lib/supabase/types.ts`**

No topo do arquivo, junto dos outros type aliases (perto da linha 20, depois de `PaymentStatus`):

```ts
export type BookingSource = 'internal' | 'public_booking'
```

No bloco `tenants` (Row/Insert/Update), adicionar os 5 campos novos. Row (depois de `default_deposit_amount: number | null`):

```ts
          default_deposit_amount: number | null
          slug: string | null
          notification_phone: string | null
          slot_duration_minutes: number
          buffer_minutes: number
          booking_hold_minutes: number
```

Insert (mesmo ponto, tudo opcional exceto os que têm default no banco continuam opcionais):

```ts
          default_deposit_amount?: number | null
          slug?: string | null
          notification_phone?: string | null
          slot_duration_minutes?: number
          buffer_minutes?: number
          booking_hold_minutes?: number
```

No bloco `appointments` (Row, depois de `deposit_amount: number | null`):

```ts
          deposit_amount: number | null
          source: BookingSource
          booking_expires_at: string | null
```

Insert (mesmo bloco):

```ts
          deposit_amount?: number | null
          source?: BookingSource
          booking_expires_at?: string | null
```

Por fim, adicionar as duas tabelas novas — inserir antes da linha `Views: Record<string, never>` (logo depois do bloco `packages`):

```ts
      professional_hours: {
        Row: {
          id: string
          tenant_id: string
          professional_id: string
          weekday: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          professional_id: string
          weekday: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['professional_hours']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'professional_hours_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
        ]
      }
      procedure_types: {
        Row: {
          id: string
          tenant_id: string
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['procedure_types']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'procedure_types_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `tenants`/`appointments`/`professional_hours`/`procedure_types`.

- [ ] **Step 5: Commit**

```bash
git add 011_agendamento_publico.sql src/lib/supabase/types.ts
git commit -m "feat: schema pra agendamento publico (slug, professional_hours, procedure_types)"
```

---

## Task 2: `src/lib/availability.ts` — cálculo puro de slots livres + testes

**Files:**
- Create: `src/lib/availability.ts`
- Create: `src/lib/availability.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada de outras tasks (função pura, sem I/O).
- Produces: `computeFreeSlots(input: ComputeFreeSlotsInput): Date[]`, tipos `WorkingHour`, `BusyInterval`, `ComputeFreeSlotsInput` — usados pela Task 4 (rota de disponibilidade).

- [ ] **Step 1: Instalar vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Adicionar script de teste no `package.json`**

Em `scripts`, adicionar (depois de `"lint": "eslint"`):

```json
    "test": "vitest run"
```

- [ ] **Step 4: Escrever os testes (falhando, `availability.ts` ainda não existe)**

`src/lib/availability.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeFreeSlots, type WorkingHour, type BusyInterval } from './availability'

// Segunda-feira 2026-08-10, 09:00-12:00, slot de 30min, sem buffer
const MONDAY: WorkingHour[] = [{ weekday: 1, startTime: '09:00', endTime: '12:00' }]

function d(iso: string) {
  return new Date(iso)
}

describe('computeFreeSlots', () => {
  it('retorna todos os slots do dia quando não há conflito', () => {
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy: [],
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-01T00:00:00-03:00'),
    })
    expect(slots.map((s) => s.toISOString())).toEqual([
      d('2026-08-10T09:00:00-03:00').toISOString(),
      d('2026-08-10T09:30:00-03:00').toISOString(),
      d('2026-08-10T10:00:00-03:00').toISOString(),
      d('2026-08-10T10:30:00-03:00').toISOString(),
      d('2026-08-10T11:00:00-03:00').toISOString(),
      d('2026-08-10T11:30:00-03:00').toISOString(),
    ])
  })

  it('exclui slot que colide com agendamento existente', () => {
    const busy: BusyInterval[] = [
      { start: d('2026-08-10T10:00:00-03:00'), end: d('2026-08-10T10:30:00-03:00') },
    ]
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy,
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-01T00:00:00-03:00'),
    })
    expect(slots.map((s) => s.toISOString())).not.toContain(d('2026-08-10T10:00:00-03:00').toISOString())
    expect(slots).toHaveLength(5)
  })

  it('buffer exclui slots vizinhos a um agendamento existente', () => {
    const busy: BusyInterval[] = [
      { start: d('2026-08-10T10:00:00-03:00'), end: d('2026-08-10T10:30:00-03:00') },
    ]
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy,
      slotDurationMinutes: 30,
      bufferMinutes: 15,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-01T00:00:00-03:00'),
    })
    // 09:30 (termina 10:00, +buffer entra no ocupado) e 10:30 (começa colado no buffer de saída) somem também
    expect(slots.map((s) => s.toISOString())).toEqual([
      d('2026-08-10T09:00:00-03:00').toISOString(),
      d('2026-08-10T11:00:00-03:00').toISOString(),
      d('2026-08-10T11:30:00-03:00').toISOString(),
    ])
  })

  it('exclui slots no passado', () => {
    const slots = computeFreeSlots({
      workingHours: MONDAY,
      busy: [],
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'),
      rangeTo: d('2026-08-10T23:59:59-03:00'),
      now: d('2026-08-10T10:15:00-03:00'),
    })
    expect(slots.map((s) => s.toISOString())).toEqual([
      d('2026-08-10T10:30:00-03:00').toISOString(),
      d('2026-08-10T11:00:00-03:00').toISOString(),
      d('2026-08-10T11:30:00-03:00').toISOString(),
    ])
  })

  it('só gera slots nos dias da semana configurados', () => {
    const slots = computeFreeSlots({
      workingHours: MONDAY, // só segunda (weekday 1)
      busy: [],
      slotDurationMinutes: 30,
      bufferMinutes: 0,
      rangeFrom: d('2026-08-10T00:00:00-03:00'), // segunda
      rangeTo: d('2026-08-11T23:59:59-03:00'), // terça
      now: d('2026-08-01T00:00:00-03:00'),
    })
    expect(slots.every((s) => s.getDay() === 1)).toBe(true)
  })
})
```

- [ ] **Step 5: Rodar e confirmar que falha**

Run: `npx vitest run src/lib/availability.test.ts`
Expected: FAIL — `Cannot find module './availability'`

- [ ] **Step 6: Implementar `src/lib/availability.ts`**

```ts
// Cálculo puro de horários livres — sem I/O, sem Supabase. Consumido pela
// rota pública de disponibilidade e pela página /agendar/[slug], ambas
// responsáveis por buscar working hours + agendamentos existentes no banco
// e passar pra cá já no formato abaixo.
export type WorkingHour = { weekday: number; startTime: string; endTime: string }
export type BusyInterval = { start: Date; end: Date }

export type ComputeFreeSlotsInput = {
  workingHours: WorkingHour[]
  busy: BusyInterval[]
  slotDurationMinutes: number
  bufferMinutes: number
  rangeFrom: Date
  rangeTo: Date
  now: Date
}

function parseTimeOnDay(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const result = new Date(day)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function computeFreeSlots({
  workingHours,
  busy,
  slotDurationMinutes,
  bufferMinutes,
  rangeFrom,
  rangeTo,
  now,
}: ComputeFreeSlotsInput): Date[] {
  const slots: Date[] = []
  const slotMs = slotDurationMinutes * 60_000
  const bufferMs = bufferMinutes * 60_000

  const expandedBusy = busy.map((b) => ({
    start: new Date(b.start.getTime() - bufferMs),
    end: new Date(b.end.getTime() + bufferMs),
  }))

  let day = startOfDay(rangeFrom)
  const lastDay = startOfDay(rangeTo)

  while (day <= lastDay) {
    const weekday = day.getDay()
    const dayHours = workingHours.filter((h) => h.weekday === weekday)

    for (const hours of dayHours) {
      const windowStart = parseTimeOnDay(day, hours.startTime)
      const windowEnd = parseTimeOnDay(day, hours.endTime)

      for (
        let slotStart = new Date(windowStart);
        slotStart.getTime() + slotMs <= windowEnd.getTime();
        slotStart = new Date(slotStart.getTime() + slotMs)
      ) {
        const slotEnd = new Date(slotStart.getTime() + slotMs)

        if (slotStart < now) continue
        if (expandedBusy.some((b) => overlaps(slotStart, slotEnd, b.start, b.end))) continue

        slots.push(new Date(slotStart))
      }
    }

    day = new Date(day.getTime() + 24 * 3600_000)
  }

  return slots
}
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `npx vitest run src/lib/availability.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 8: Commit**

```bash
git add src/lib/availability.ts src/lib/availability.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: calculo puro de slots livres (availability.ts) com testes"
```

---

## Task 3: Configuração — tipos de procedimento (CRUD)

**Files:**
- Create: `src/app/actions/procedure-types.ts`
- Create: `src/components/configuracoes/ProcedureTypesForm.tsx`
- Create: `src/app/(dashboard)/configuracoes/procedimentos/page.tsx`

**Interfaces:**
- Consumes: `getCurrentTenant()` de `src/lib/tenant.ts`, `createClient()` de `src/lib/supabase/server.ts` (padrão já usado em `src/app/actions/professionals.ts`).
- Produces: linhas em `procedure_types` que a Task 6 (POST booking) e Task 7 (página pública) consomem via `select id, name from procedure_types where tenant_id = ? and active = true`.

- [ ] **Step 1: Server actions**

`src/app/actions/procedure-types.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createProcedureTypeAction(name: string) {
  if (!name.trim()) return { error: 'Informe um nome.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('procedure_types').insert({ tenant_id: tenant.id, name: name.trim() })

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}

export async function toggleProcedureTypeAction(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('procedure_types').update({ active }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/procedimentos')
}
```

- [ ] **Step 2: Componente de formulário/lista**

`src/components/configuracoes/ProcedureTypesForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createProcedureTypeAction, toggleProcedureTypeAction } from '@/app/actions/procedure-types'

type ProcedureType = { id: string; name: string; active: boolean }

export function ProcedureTypesForm({ initial }: { initial: ProcedureType[] }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProcedureTypeAction(name)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Novo procedimento</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Limpeza"
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
        {initial.map((p) => (
          <label key={p.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <span className="text-sm text-text">{p.name}</span>
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) =>
                startTransition(async () => {
                  await toggleProcedureTypeAction(p.id, e.target.checked)
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

`src/app/(dashboard)/configuracoes/procedimentos/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { ProcedureTypesForm } from '@/components/configuracoes/ProcedureTypesForm'

export default async function ProcedimentosPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const { data: procedureTypes } = tenant
    ? await supabase
        .from('procedure_types')
        .select('id, name, active')
        .eq('tenant_id', tenant.id)
        .order('name')
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Procedimentos</h1>
        <p className="text-text-secondary">
          Lista de procedimentos que o paciente escolhe ao agendar pelo link público. Desmarque pra
          esconder sem apagar o histórico.
        </p>
      </div>
      <ProcedureTypesForm initial={procedureTypes ?? []} />
    </div>
  )
}
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/procedure-types.ts src/components/configuracoes/ProcedureTypesForm.tsx "src/app/(dashboard)/configuracoes/procedimentos/page.tsx"
git commit -m "feat: config de tipos de procedimento pro agendamento publico"
```

---

## Task 4: Configuração — horário de trabalho por profissional

**Files:**
- Create: `src/app/actions/professional-hours.ts`
- Create: `src/components/agenda/ProfessionalHoursForm.tsx`
- Modify: `src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `createClient()`, `getCurrentTenant()` (mesmo padrão da Task 3).
- Produces: linhas em `professional_hours` que a Task 5 (rota de disponibilidade) consome via `select weekday, start_time, end_time from professional_hours where professional_id = ?`.

- [ ] **Step 1: Server action — substitui todos os horários do profissional de uma vez** (mesmo padrão full-replace de `updateBusinessHoursAction`)

`src/app/actions/professional-hours.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type ProfessionalHourInput = { weekday: number; active: boolean; start: string; end: string }

export async function updateProfessionalHoursAction(professionalId: string, days: ProfessionalHourInput[]) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  for (const day of days) {
    if (day.active && day.start >= day.end) {
      return { error: 'Horário de início precisa ser antes do horário de término.' }
    }
  }

  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('professional_hours')
    .delete()
    .eq('professional_id', professionalId)

  if (deleteError) return { error: deleteError.message }

  const rows = days
    .filter((d) => d.active)
    .map((d) => ({
      tenant_id: tenant.id,
      professional_id: professionalId,
      weekday: d.weekday,
      start_time: d.start,
      end_time: d.end,
    }))

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('professional_hours').insert(rows)
    if (insertError) return { error: insertError.message }
  }

  revalidatePath(`/agenda/profissionais/${professionalId}/editar`)
}
```

- [ ] **Step 2: Componente de formulário**

`src/components/agenda/ProfessionalHoursForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateProfessionalHoursAction, type ProfessionalHourInput } from '@/app/actions/professional-hours'

const WEEKDAYS = [
  { weekday: 1, label: 'Segunda-feira' },
  { weekday: 2, label: 'Terça-feira' },
  { weekday: 3, label: 'Quarta-feira' },
  { weekday: 4, label: 'Quinta-feira' },
  { weekday: 5, label: 'Sexta-feira' },
  { weekday: 6, label: 'Sábado' },
  { weekday: 0, label: 'Domingo' },
]

function buildInitial(existing: { weekday: number; start_time: string; end_time: string }[]): ProfessionalHourInput[] {
  return WEEKDAYS.map(({ weekday }) => {
    const found = existing.find((e) => e.weekday === weekday)
    return {
      weekday,
      active: !!found,
      start: found?.start_time.slice(0, 5) ?? '09:00',
      end: found?.end_time.slice(0, 5) ?? '18:00',
    }
  })
}

export function ProfessionalHoursForm({
  professionalId,
  existing,
}: {
  professionalId: string
  existing: { weekday: number; start_time: string; end_time: string }[]
}) {
  const [days, setDays] = useState<ProfessionalHourInput[]>(buildInitial(existing))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function updateDay(weekday: number, patch: Partial<ProfessionalHourInput>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateProfessionalHoursAction(professionalId, days)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {WEEKDAYS.map(({ weekday, label }) => {
          const day = days.find((d) => d.weekday === weekday)!
          return (
            <div key={weekday} className="flex items-center gap-3 px-4 py-3">
              <label className="flex w-40 items-center gap-2">
                <input
                  type="checkbox"
                  checked={day.active}
                  onChange={(e) => updateDay(weekday, { active: e.target.checked })}
                />
                <span className="text-sm text-text">{label}</span>
              </label>
              <input
                type="time"
                disabled={!day.active}
                value={day.start}
                onChange={(e) => updateDay(weekday, { start: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
              />
              <span className="text-text-secondary">até</span>
              <input
                type="time"
                disabled={!day.active}
                value={day.end}
                onChange={(e) => updateDay(weekday, { end: e.target.value })}
                className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent disabled:opacity-40"
              />
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar horários'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Plugar na página de edição de profissional**

Modificar `src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx` — trocar o conteúdo inteiro por:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfessionalForm } from '@/components/agenda/ProfessionalForm'
import { ProfessionalHoursForm } from '@/components/agenda/ProfessionalHoursForm'

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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-text">Editar profissional</h1>
        <ProfessionalForm
          professionalId={professional.id}
          initial={{ name: professional.name, color: professional.color, active: professional.active }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Horário de trabalho</h2>
          <p className="text-text-secondary">Usado pra calcular horários livres no link público de agendamento.</p>
        </div>
        <ProfessionalHoursForm professionalId={professional.id} existing={hours ?? []} />
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
git add src/app/actions/professional-hours.ts src/components/agenda/ProfessionalHoursForm.tsx "src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx"
git commit -m "feat: horario de trabalho por profissional"
```

---

## Task 5: Configuração — link público e regras de reserva

**Files:**
- Create: `src/app/actions/booking-settings.ts`
- Create: `src/components/configuracoes/BookingSettingsForm.tsx`
- Create: `src/app/(dashboard)/configuracoes/agendamento-publico/page.tsx`

**Interfaces:**
- Consumes: `getCurrentTenant()`, `createClient()`.
- Produces: `tenants.slug`, `tenants.notification_phone`, `tenants.slot_duration_minutes`, `tenants.buffer_minutes`, `tenants.booking_hold_minutes` preenchidos — consumidos pelas Tasks 6/7/8/9.

- [ ] **Step 1: Server action**

`src/app/actions/booking-settings.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type BookingSettingsInput = {
  slug: string
  notificationPhone: string
  slotDurationMinutes: number
  bufferMinutes: number
  bookingHoldMinutes: number
}

const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function updateBookingSettingsAction(input: BookingSettingsInput) {
  const slug = input.slug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    return { error: 'O link só pode ter letras minúsculas, números e hífen.' }
  }
  if (input.slotDurationMinutes <= 0) {
    return { error: 'Duração do slot precisa ser maior que zero.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      slug,
      notification_phone: input.notificationPhone.trim() || null,
      slot_duration_minutes: input.slotDurationMinutes,
      buffer_minutes: input.bufferMinutes,
      booking_hold_minutes: input.bookingHoldMinutes,
    })
    .eq('id', tenant.id)

  if (error) {
    if (error.message.includes('duplicate key')) {
      return { error: 'Esse link já está em uso por outra clínica.' }
    }
    return { error: error.message }
  }

  revalidatePath('/configuracoes/agendamento-publico')
}
```

- [ ] **Step 2: Componente de formulário**

`src/components/configuracoes/BookingSettingsForm.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { updateBookingSettingsAction } from '@/app/actions/booking-settings'

export function BookingSettingsForm({
  initial,
}: {
  initial: {
    slug: string
    notificationPhone: string
    slotDurationMinutes: number
    bufferMinutes: number
    bookingHoldMinutes: number
  }
}) {
  const [slug, setSlug] = useState(initial.slug)
  const [notificationPhone, setNotificationPhone] = useState(initial.notificationPhone)
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(String(initial.slotDurationMinutes))
  const [bufferMinutes, setBufferMinutes] = useState(String(initial.bufferMinutes))
  const [bookingHoldMinutes, setBookingHoldMinutes] = useState(String(initial.bookingHoldMinutes))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateBookingSettingsAction({
        slug,
        notificationPhone,
        slotDurationMinutes: Number(slotDurationMinutes),
        bufferMinutes: Number(bufferMinutes),
        bookingHoldMinutes: Number(bookingHoldMinutes),
      })
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
        <span className="text-sm font-medium text-text">Link público (slug)</span>
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <span>nexhub.com.br/agendar/</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="minha-clinica"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">WhatsApp para notificação de novo agendamento</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={notificationPhone}
          onChange={(e) => setNotificationPhone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Duração do slot (minutos)</span>
        <input
          type="number"
          min={5}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={slotDurationMinutes}
          onChange={(e) => setSlotDurationMinutes(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Intervalo mínimo entre consultas (minutos)</span>
        <input
          type="number"
          min={0}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={bufferMinutes}
          onChange={(e) => setBufferMinutes(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Tempo pro paciente pagar o sinal antes de expirar (minutos)</span>
        <input
          type="number"
          min={10}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={bookingHoldMinutes}
          onChange={(e) => setBookingHoldMinutes(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending || !slug.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Página de configuração**

`src/app/(dashboard)/configuracoes/agendamento-publico/page.tsx`:

```tsx
import { getCurrentTenant } from '@/lib/tenant'
import { BookingSettingsForm } from '@/components/configuracoes/BookingSettingsForm'

export default async function AgendamentoPublicoPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Agendamento público</h1>
        <p className="text-text-secondary">
          Link que o paciente usa pra marcar consulta sozinho, vendo só horários realmente livres.
        </p>
      </div>
      {tenant && (
        <BookingSettingsForm
          initial={{
            slug: tenant.slug ?? '',
            notificationPhone: tenant.notification_phone ?? '',
            slotDurationMinutes: tenant.slot_duration_minutes,
            bufferMinutes: tenant.buffer_minutes,
            bookingHoldMinutes: tenant.booking_hold_minutes,
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/booking-settings.ts src/components/configuracoes/BookingSettingsForm.tsx "src/app/(dashboard)/configuracoes/agendamento-publico/page.tsx"
git commit -m "feat: config de link publico, notificacao e regras de slot"
```

---

## Task 6: Rota pública de disponibilidade

**Files:**
- Create: `src/app/api/public/booking/[slug]/availability/route.ts`

**Interfaces:**
- Consumes: `computeFreeSlots` (Task 2, `src/lib/availability.ts`), `createAdminClient()` (`src/lib/supabase/admin.ts`).
- Produces: `GET /api/public/booking/{slug}/availability?professionalId=X` → `{ slots: string[] }` (ISO strings) — consumido pela Task 9 (`BookingFlow`).

- [ ] **Step 1: Implementar a rota**

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeFreeSlots, type BusyInterval } from '@/lib/availability'

const BOOKING_WINDOW_DAYS = 14

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const professionalId = searchParams.get('professionalId')

  if (!professionalId) {
    return NextResponse.json({ error: 'professionalId é obrigatório.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slot_duration_minutes, buffer_minutes')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 })
  }

  const now = new Date()
  const rangeFrom = now
  const rangeTo = new Date(now.getTime() + BOOKING_WINDOW_DAYS * 24 * 3600_000)

  const { data: workingHours } = await admin
    .from('professional_hours')
    .select('weekday, start_time, end_time')
    .eq('professional_id', professionalId)

  const { data: appointments } = await admin
    .from('appointments')
    .select('datetime, duration_min')
    .eq('professional_id', professionalId)
    .in('status', ['pending', 'confirmed'])
    .gte('datetime', rangeFrom.toISOString())
    .lte('datetime', rangeTo.toISOString())

  const busy: BusyInterval[] = (appointments ?? []).map((a) => ({
    start: new Date(a.datetime),
    end: new Date(new Date(a.datetime).getTime() + a.duration_min * 60_000),
  }))

  const slots = computeFreeSlots({
    workingHours: (workingHours ?? []).map((h) => ({
      weekday: h.weekday,
      startTime: h.start_time.slice(0, 5),
      endTime: h.end_time.slice(0, 5),
    })),
    busy,
    slotDurationMinutes: tenant.slot_duration_minutes,
    bufferMinutes: tenant.buffer_minutes,
    rangeFrom,
    rangeTo,
    now,
  })

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) })
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual** (precisa de um tenant com slug + professional_hours cadastrados via Tasks 4/5 — pode ser feito depois da Task 9, ou direto via curl se já houver dado de teste)

Run: `curl "http://localhost:3000/api/public/booking/SLUG-DE-TESTE/availability?professionalId=ID-DE-TESTE"`
Expected: `{"slots":[...]}` com horários dentro do horário de trabalho cadastrado, sem os já ocupados.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/public/booking/[slug]/availability/route.ts"
git commit -m "feat: rota publica de disponibilidade de horarios"
```

---

## Task 7: Notificação da clínica sobre novo agendamento

**Files:**
- Create: `src/lib/booking-notifications.ts`

**Interfaces:**
- Consumes: `sendWhatsAppText` (`src/lib/evolution.ts`), `EvolutionConfig` type.
- Produces: `notifyTenantOfBooking(config, notificationPhone, details)` — usado pela Task 8 (rota POST de booking).

- [ ] **Step 1: Implementar**

```ts
// Aviso pro WhatsApp da clínica quando um paciente agenda pelo link público.
// Separado de appointment-automation.ts porque é específico do fluxo de
// booking público — as funções de lá (confirmAppointment/cancelAppointment)
// falam com o paciente, essa fala com a clínica.
import { sendWhatsAppText, type EvolutionConfig } from '@/lib/evolution'

export async function notifyTenantOfBooking(
  config: EvolutionConfig,
  notificationPhone: string,
  details: { clientName: string; procedureName: string; professionalName: string; datetime: string }
): Promise<void> {
  const date = new Date(details.datetime)
  const dateLabel = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const timeLabel = date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

  const message = `Novo agendamento pelo link público!\n${details.clientName} — ${details.procedureName}\nCom ${details.professionalName} em ${dateLabel} às ${timeLabel}.`

  await sendWhatsAppText(config, notificationPhone, message)
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/booking-notifications.ts
git commit -m "feat: notificacao da clinica sobre novo agendamento publico"
```

---

## Task 8: Rota pública de criação de agendamento (POST)

**Files:**
- Create: `src/app/api/public/booking/[slug]/route.ts`

**Interfaces:**
- Consumes: `confirmAppointment` (`src/lib/appointment-automation.ts`), `normalizePhone` (`src/lib/evolution.ts`), `notifyTenantOfBooking` (Task 7), `createAdminClient`.
- Produces: `POST /api/public/booking/{slug}` → `{ ok: true, appointmentId: string } | { error: string }` (status 409 se slot foi ocupado entre a consulta e o submit) — consumido pela Task 9.

- [ ] **Step 1: Implementar a rota**

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/evolution'
import { confirmAppointment } from '@/lib/appointment-automation'
import { notifyTenantOfBooking } from '@/lib/booking-notifications'

type BookingBody = {
  professionalId: string
  procedureTypeId: string
  datetime: string
  patientName: string
  patientPhone: string
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await request.json()) as Partial<BookingBody>

  if (!body.professionalId || !body.procedureTypeId || !body.datetime || !body.patientName?.trim() || !body.patientPhone?.trim()) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 })
  }

  const phone = normalizePhone(body.patientPhone)
  if (!phone) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slot_duration_minutes, buffer_minutes, booking_hold_minutes, notification_phone, evolution_base_url, evolution_api_key, evolution_instance_name')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 })
  }

  const { data: procedureType } = await admin
    .from('procedure_types')
    .select('name')
    .eq('id', body.procedureTypeId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!procedureType) {
    return NextResponse.json({ error: 'Procedimento inválido.' }, { status: 400 })
  }

  const requestedStart = new Date(body.datetime)
  const requestedEnd = new Date(requestedStart.getTime() + tenant.slot_duration_minutes * 60_000)
  const bufferMs = tenant.buffer_minutes * 60_000

  // Revalida que o slot ainda está livre (protege contra dois pacientes
  // batendo no mesmo horário entre a consulta de disponibilidade e o submit).
  const { data: conflicting } = await admin
    .from('appointments')
    .select('id, datetime, duration_min')
    .eq('professional_id', body.professionalId)
    .in('status', ['pending', 'confirmed'])
    .gte('datetime', new Date(requestedStart.getTime() - 24 * 3600_000).toISOString())
    .lte('datetime', new Date(requestedStart.getTime() + 24 * 3600_000).toISOString())

  const hasConflict = (conflicting ?? []).some((a) => {
    const aStart = new Date(new Date(a.datetime).getTime() - bufferMs)
    const aEnd = new Date(new Date(a.datetime).getTime() + a.duration_min * 60_000 + bufferMs)
    return requestedStart < aEnd && aStart < requestedEnd
  })

  if (hasConflict) {
    return NextResponse.json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' }, { status: 409 })
  }

  // Acha cliente existente pelos últimos 8 dígitos do telefone (mesmo
  // critério usado em findPendingAppointmentByPhone) ou cria um novo.
  const { data: existingClients } = await admin.from('clients').select('id, phone').eq('tenant_id', tenant.id)
  const match = (existingClients ?? []).find((c) => c.phone?.replace(/\D/g, '').endsWith(phone.slice(-8)))

  let clientId = match?.id
  if (!clientId) {
    const { data: newClient, error: clientError } = await admin
      .from('clients')
      .insert({ tenant_id: tenant.id, name: body.patientName.trim(), phone: body.patientPhone.trim() })
      .select('id')
      .single()
    if (clientError || !newClient) {
      return NextResponse.json({ error: clientError?.message ?? 'Erro ao cadastrar paciente.' }, { status: 500 })
    }
    clientId = newClient.id
  }

  const bookingExpiresAt = new Date(Date.now() + tenant.booking_hold_minutes * 60_000).toISOString()

  const { data: appointment, error: apptError } = await admin
    .from('appointments')
    .insert({
      tenant_id: tenant.id,
      type: 'consulta',
      client_id: clientId,
      professional_id: body.professionalId,
      title: procedureType.name,
      datetime: requestedStart.toISOString(),
      duration_min: tenant.slot_duration_minutes,
      status: 'pending',
      source: 'public_booking',
      booking_expires_at: bookingExpiresAt,
    })
    .select('id')
    .single()

  if (apptError || !appointment) {
    return NextResponse.json({ error: apptError?.message ?? 'Erro ao criar agendamento.' }, { status: 500 })
  }

  // Reusa a automação já existente: marca confirmed, manda mensagem de
  // confirmação + Pix do sinal (se a clínica tiver default_deposit_amount
  // configurado) — nenhuma lógica de envio é duplicada aqui.
  await confirmAppointment(appointment.id)

  if (tenant.notification_phone && tenant.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    try {
      await notifyTenantOfBooking(
        {
          baseUrl: tenant.evolution_base_url,
          apiKey: tenant.evolution_api_key,
          instanceName: tenant.evolution_instance_name,
        },
        tenant.notification_phone,
        {
          clientName: body.patientName.trim(),
          procedureName: procedureType.name,
          professionalName: '',
          datetime: requestedStart.toISOString(),
        }
      )
    } catch {
      // Agendamento já foi criado e confirmado — falha só no aviso da
      // clínica não deve derrubar a resposta pro paciente.
    }
  }

  return NextResponse.json({ ok: true, appointmentId: appointment.id })
}
```

Nota: `professionalName` fica vazio porque a rota não busca `professionals.name` — próximo passo natural seria incluir esse select, mas como não afeta a confirmação do paciente (só o texto do aviso interno), deixar TODO seria proibido pelo processo; então: adicionar o select agora, dentro do mesmo Step.

Ajustar o bloco de busca do tenant pra também trazer o nome do profissional:

```ts
  const { data: professional } = await admin
    .from('professionals')
    .select('name')
    .eq('id', body.professionalId)
    .single()
```

(inserir logo após o bloco `procedureType`, antes da verificação de conflito) e trocar `professionalName: ''` por `professionalName: professional?.name ?? ''`.

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual**

Run:
```bash
curl -X POST "http://localhost:3000/api/public/booking/SLUG-DE-TESTE" \
  -H "Content-Type: application/json" \
  -d '{"professionalId":"ID","procedureTypeId":"ID","datetime":"2026-08-11T13:00:00-03:00","patientName":"Teste","patientPhone":"11999999999"}'
```
Expected: `{"ok":true,"appointmentId":"..."}`; conferir no Supabase que a linha em `appointments` tem `status='confirmed'`, `source='public_booking'`, `booking_expires_at` preenchido.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/public/booking/[slug]/route.ts"
git commit -m "feat: rota publica de criacao de agendamento (POST booking)"
```

---

## Task 9: Página pública `/agendar/[slug]`

**Files:**
- Create: `src/app/agendar/[slug]/page.tsx`
- Create: `src/app/agendar/[slug]/BookingFlow.tsx`

**Interfaces:**
- Consumes: `GET /api/public/booking/{slug}/availability` (Task 6), `POST /api/public/booking/{slug}` (Task 8).
- Produces: rota pública final `nexhub.com.br/agendar/{slug}`.

- [ ] **Step 1: Server component da página**

`src/app/agendar/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingFlow } from './BookingFlow'

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id, name, slug').eq('slug', slug).single()
  if (!tenant) notFound()

  const { data: professionals } = await admin
    .from('professionals')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  const { data: procedureTypes } = await admin
    .from('procedure_types')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name')

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">Agendar consulta — {tenant.name}</h1>
        <p className="text-text-secondary">Escolha o profissional, o procedimento e um horário disponível.</p>
      </div>
      <BookingFlow
        slug={slug}
        professionals={professionals ?? []}
        procedureTypes={procedureTypes ?? []}
      />
    </div>
  )
}
```

- [ ] **Step 2: Client component do wizard**

`src/app/agendar/[slug]/BookingFlow.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

type Professional = { id: string; name: string }
type ProcedureType = { id: string; name: string }

export function BookingFlow({
  slug,
  professionals,
  procedureTypes,
}: {
  slug: string
  professionals: Professional[]
  procedureTypes: ProcedureType[]
}) {
  const [professionalId, setProfessionalId] = useState('')
  const [procedureTypeId, setProcedureTypeId] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!professionalId) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedSlot(null)
    fetch(`/api/public/booking/${slug}/availability?professionalId=${professionalId}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }, [professionalId, slug])

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
          patientPhone: phone,
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
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-medium text-text">Agendamento reservado!</p>
        <p className="text-text-secondary">
          Te mandamos o Pix do sinal por WhatsApp. Pague pra confirmar seu horário.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Profissional</span>
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Procedimento</span>
        <select
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={procedureTypeId}
          onChange={(e) => setProcedureTypeId(e.target.value)}
        >
          <option value="">Selecione</option>
          {procedureTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {professionalId && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text">Horário</span>
          {loadingSlots && <p className="text-sm text-text-secondary">Carregando horários...</p>}
          {!loadingSlots && slots.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhum horário disponível nos próximos 14 dias.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => {
              const date = new Date(slot)
              const label = date.toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border px-2 py-2 text-xs ${
                    selectedSlot === slot ? 'border-accent bg-accent text-white' : 'border-border bg-surface text-text'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Seu nome</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Seu WhatsApp</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !selectedSlot}
        className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-40"
      >
        {submitting ? 'Agendando...' : 'Confirmar agendamento'}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 4: Verificação manual no navegador**

Run: `npm run dev`, abrir `http://localhost:3000/agendar/SLUG-DE-TESTE`.
Expected: escolher profissional mostra horários livres calculados de `professional_hours`; escolher horário + preencher dados + submeter mostra tela de sucesso; conferir no WhatsApp de teste que chegou o Pix.

- [ ] **Step 5: Commit**

```bash
git add "src/app/agendar"
git commit -m "feat: pagina publica de agendamento /agendar/[slug]"
```

---

## Task 10: Expiração automática de reserva não paga

**Files:**
- Create: `src/app/api/automations/expire-bookings/route.ts`

**Interfaces:**
- Consumes: `cancelAppointment` (`src/lib/appointment-automation.ts`), `createAdminClient`.
- Produces: `POST /api/automations/expire-bookings` (chamado por n8n a cada ~15min, mesmo padrão de `/api/automations/reminders`).

- [ ] **Step 1: Implementar a rota**

```ts
// Chamado pelo n8n (cron a cada ~15min) — cancela agendamentos vindos do
// link público cujo sinal não foi pago dentro do prazo (tenants.booking_hold_minutes),
// liberando o horário pros próximos. Reusa cancelAppointment, que já marca
// status='cancelled' e avisa o paciente por WhatsApp.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelAppointment } from '@/lib/appointment-automation'

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.AUTOMATION_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: expired, error } = await admin
    .from('appointments')
    .select('id')
    .eq('source', 'public_booking')
    .eq('payment_status', 'aguardando')
    .not('booking_expires_at', 'is', null)
    .lt('booking_expires_at', now)
    .neq('status', 'cancelled')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { appointmentId: string; ok: boolean; error?: string }[] = []

  for (const appt of expired ?? []) {
    const result = await cancelAppointment(appt.id)
    results.push({ appointmentId: appt.id, ok: !('error' in result), error: 'error' in result ? result.error : undefined })
  }

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual**

Criar um agendamento de teste via Task 8 com `booking_hold_minutes` baixo (ex: editar a linha direto no Supabase pra `booking_expires_at` no passado), depois:

Run: `curl -X POST "http://localhost:3000/api/automations/expire-bookings" -H "x-api-key: $AUTOMATION_API_KEY"`
Expected: `{"results":[{"appointmentId":"...","ok":true}]}`; conferir no Supabase que `status='cancelled'`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/automations/expire-bookings/route.ts
git commit -m "feat: cron de expiracao de reserva publica nao paga"
```

---

## Task 11: Configurar n8n pra chamar o novo cron

**Files:**
- Nenhum arquivo do repo (configuração externa no n8n).

**Interfaces:**
- Consumes: `POST /api/automations/expire-bookings` (Task 10).

- [ ] **Step 1: Duplicar o workflow/node do n8n que já chama `/api/automations/reminders`, apontando pra `/api/automations/expire-bookings`, mesmo header `x-api-key`, intervalo de ~15min.**

- [ ] **Step 2: Rodar manualmente uma vez no n8n e conferir retorno 200 com `results: []` (ou com cancelamentos, se houver reserva expirada de teste).**

Sem commit — task de configuração de infra fora do repo.

---

## Self-Review

**Cobertura da spec:** link público por slug (Task 9), só horários livres calculados de disponibilidade real (Tasks 2/6), nome+telefone+procedimento (Task 9), confirmação automática por WhatsApp + notificação da clínica (Tasks 7/8, reusando `confirmAppointment`), encaixe no lembrete 24h existente (automático — `reminders/route.ts` já pega qualquer `status in (pending, confirmed)`, nenhuma mudança necessária), buffer mínimo configurável (Tasks 2/5/6). Expiração de reserva não paga: Task 10. Confirmação manual de pagamento pela secretária: já existe (`markAppointmentPaidAction`) e não precisou de mudança — `status` já é `confirmed` desde a criação (via `confirmAppointment`), só `payment_status` muda de `aguardando` pra `confirmado`, o que automaticamente tira o agendamento da mira do cron de expiração (Task 10 filtra por `payment_status='aguardando'`).

**Placeholders:** nenhum TBD/TODO restante — o único ponto que citava "próximo passo" (nome do profissional na notificação, Task 8) foi resolvido dentro da própria task, não deixado pendente.

**Consistência de tipos:** `ComputeFreeSlotsInput`/`WorkingHour`/`BusyInterval` (Task 2) usados com os mesmos nomes de campo em Task 6. `BookingSource` (Task 1) usado em `source: 'public_booking'` nas Tasks 8/10. `EvolutionConfig` (existente) reusado sem alteração em Task 7/8.
