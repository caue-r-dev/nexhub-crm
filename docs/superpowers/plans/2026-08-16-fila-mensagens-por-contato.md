# Fila de mensagens por contato (lock de processamento) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que nenhuma mensagem do WhatsApp seja descartada em silêncio quando o mesmo contato manda várias mensagens seguidas, sem trocar Evolution API/Chatwoot/Gemini.

**Architecture:** Uma tabela de "claim" (`contact_locks`, chave primária `tenant_id + contact_phone`) serializa o processamento de mensagens do mesmo contato via insert atômico; contatos diferentes nunca competem entre si. Locks parados (invocação anterior crashou) expiram sozinhos por idade. Se a espera pelo lock estourar um orçamento curto, manda a mensagem de ausência direto, sem IA. Chamadas externas (Gemini, Evolution API) ganham 1 retry automático + log estruturado.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres via `@supabase/supabase-js`), Vitest.

## Global Constraints

- Nenhuma mudança na lógica de roteiro, handoff, escalação ou nos provedores (Evolution/Chatwoot/Gemini) — spec: "O que NÃO muda".
- Lock nunca depende da IA "lembrar" de liberar — spec: lock morto expira por idade (~20s), sempre.
- Orçamento de espera pelo lock: ~9s antes de desistir e mandar fallback direto — spec item 4.
- Retry: exatamente 1 tentativa extra em falha de rede/timeout (não em JSON inválido, que já não lança erro) — spec item 5.
- Toda falha de chamada externa (Gemini, Evolution API) deve logar via `console.error`, nunca ser engolida em silêncio.

---

### Task 1: Migration `contact_locks` + tipos Supabase

**Files:**
- Create: `044_contact_locks.sql`
- Modify: `src/lib/supabase/types.ts` (novo bloco de tabela, inserido depois do bloco `evolution_incidents`)

**Interfaces:**
- Produces: tabela `contact_locks(tenant_id uuid, contact_phone text, locked_at timestamptz)`, chave primária composta `(tenant_id, contact_phone)`. Tipo `Database['public']['Tables']['contact_locks']['Row']` com campos `tenant_id: string`, `contact_phone: string`, `locked_at: string`.

- [ ] **Step 1: Escrever a migration**

```sql
-- Lock de processamento por contato: serializa mensagens do mesmo
-- contato (evita a race condition onde duas mensagens quase simultâneas
-- rodam a IA em paralelo e a que perde a corrida de gravação em
-- conversation_state é descartada em silêncio, sem retry). Chave
-- primária composta = claim atômico via insert (constraint única).
-- Contatos diferentes nunca competem entre si.
create table contact_locks (
  tenant_id uuid references tenants(id) not null,
  contact_phone text not null,
  locked_at timestamptz not null default now(),
  primary key (tenant_id, contact_phone)
);
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Cola o SQL acima no SQL Editor do projeto Supabase (`https://mbgndoxqntynapfwatim.supabase.co`) e roda. Se estiver executando via Claude Code com acesso ao Claude in Chrome, pode abrir o dashboard do Supabase e colar/rodar direto ali em vez de pedir pro usuário.

- [ ] **Step 3: Confirmar que a tabela existe**

Run: `curl -s "https://mbgndoxqntynapfwatim.supabase.co/rest/v1/contact_locks?select=*&limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"`
Expected: `[]` (tabela existe, vazia) — não `{"code":"42P01"...}` (tabela não existe).

- [ ] **Step 4: Adicionar o tipo da tabela em `src/lib/supabase/types.ts`**

Insere logo depois do bloco `evolution_incidents` (procura por `evolution_incidents: {` e o `}` que fecha esse bloco, cola depois):

```typescript
      contact_locks: {
        Row: {
          tenant_id: string
          contact_phone: string
          locked_at: string
        }
        Insert: {
          tenant_id: string
          contact_phone: string
          locked_at?: string
        }
        Update: Partial<Database['public']['Tables']['contact_locks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'contact_locks_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
```

- [ ] **Step 5: Checar tipos**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erro relacionado a `supabase/types.ts` ou `contact_locks`.

- [ ] **Step 6: Commit**

```bash
git add 044_contact_locks.sql src/lib/supabase/types.ts
git commit -m "feat: tabela contact_locks pra serializar processamento por contato"
```

---

### Task 2: `src/lib/contact-lock.ts` — claim, release, espera com orçamento

**Files:**
- Create: `src/lib/contact-lock.ts`
- Create: `src/lib/contact-lock.test.ts`

**Interfaces:**
- Consumes: `createAdminClient` de `@/lib/supabase/admin` (mesmo padrão usado em `bot-engine.ts`).
- Produces:
  - `isLockStale(lockedAt: string, now: Date, staleMs?: number): boolean` — função pura, exportada, testável sem banco.
  - `acquireContactLock(tenantId: string, phone: string): Promise<boolean>` — tenta pegar o lock, espera até o orçamento (~9s) se ocupado, limpa lock morto no caminho. Retorna `true` se conseguiu, `false` se estourou o orçamento.
  - `releaseContactLock(tenantId: string, phone: string): Promise<void>` — sempre chamado em `finally` por quem usa `acquireContactLock`.

- [ ] **Step 1: Escrever o teste da função pura `isLockStale`**

```typescript
import { describe, it, expect } from 'vitest'
import { isLockStale } from './contact-lock'

describe('isLockStale', () => {
  it('retorna false pra lock recente (dentro do limite padrão)', () => {
    const lockedAt = '2026-08-16T12:00:00-03:00'
    const now = new Date('2026-08-16T12:00:05-03:00')
    expect(isLockStale(lockedAt, now)).toBe(false)
  })

  it('retorna true pra lock mais velho que o limite padrão (~20s)', () => {
    const lockedAt = '2026-08-16T12:00:00-03:00'
    const now = new Date('2026-08-16T12:00:25-03:00')
    expect(isLockStale(lockedAt, now)).toBe(true)
  })

  it('respeita staleMs customizado', () => {
    const lockedAt = '2026-08-16T12:00:00-03:00'
    const now = new Date('2026-08-16T12:00:03-03:00')
    expect(isLockStale(lockedAt, now, 2_000)).toBe(true)
    expect(isLockStale(lockedAt, now, 5_000)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha (função ainda não existe)**

Run: `npx vitest run src/lib/contact-lock.test.ts`
Expected: FAIL — `Cannot find module './contact-lock'` ou `isLockStale is not a function`.

- [ ] **Step 3: Implementar `src/lib/contact-lock.ts`**

```typescript
// Lock de processamento por contato: serializa mensagens do mesmo
// contato (tenant_id + phone) sem serializar contatos diferentes entre
// si. Usa uma tabela de claim (constraint única em vez de
// pg_advisory_lock) porque o acesso ao banco aqui é via PostgREST
// (@supabase/supabase-js) — cada chamada é sua própria transação
// isolada, um lock consultivo do Postgres morreria antes do
// processamento (chamada ao Gemini, envio WhatsApp) terminar.
import { createAdminClient } from '@/lib/supabase/admin'

const STALE_LOCK_MS = 20_000
const WAIT_BUDGET_MS = 9_000
const POLL_INTERVAL_MS = 300

// Lock mais velho que isso é considerado de uma invocação que crashou
// sem liberar — nunca depende de a IA "lembrar" de liberar.
export function isLockStale(lockedAt: string, now: Date, staleMs: number = STALE_LOCK_MS): boolean {
  return now.getTime() - new Date(lockedAt).getTime() > staleMs
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tryClaim(tenantId: string, phone: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('contact_locks').insert({ tenant_id: tenantId, contact_phone: phone })
  return !error
}

async function clearIfStale(tenantId: string, phone: string): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('contact_locks')
    .select('locked_at')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (data && isLockStale(data.locked_at, new Date())) {
    // Apaga só se ninguém trocou o lock nesse meio-tempo (locked_at igual
    // ao que acabou de ler) — evita apagar um claim novo por engano.
    await admin
      .from('contact_locks')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('contact_phone', phone)
      .eq('locked_at', data.locked_at)
  }
}

// Tenta pegar o lock; se outro processo do mesmo contato já tá segurando,
// espera até WAIT_BUDGET_MS liberando (limpando lock morto no caminho).
// Retorna false só quando estourou o orçamento de espera — quem chamar
// deve mandar o fallback de ausência direto nesse caso, sem IA.
export async function acquireContactLock(tenantId: string, phone: string): Promise<boolean> {
  const deadline = Date.now() + WAIT_BUDGET_MS
  while (Date.now() < deadline) {
    if (await tryClaim(tenantId, phone)) return true
    await clearIfStale(tenantId, phone)
    await sleep(POLL_INTERVAL_MS)
  }
  return tryClaim(tenantId, phone)
}

export async function releaseContactLock(tenantId: string, phone: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('contact_locks').delete().eq('tenant_id', tenantId).eq('contact_phone', phone)
}
```

- [ ] **Step 4: Rodar o teste de novo e confirmar que passa**

Run: `npx vitest run src/lib/contact-lock.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Checar tipos**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erro em `contact-lock.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/contact-lock.ts src/lib/contact-lock.test.ts
git commit -m "feat: lock de processamento por contato (claim/release/espera com orcamento)"
```

---

### Task 3: Retry automático na chamada ao Gemini

**Files:**
- Modify: `src/lib/conversational-bot.ts:154-172` (função `decideBotTurn`)
- Modify: `src/lib/conversational-bot.test.ts` (2 novos testes)

**Interfaces:**
- Consumes: nada novo — mesma assinatura pública de `decideBotTurn` (não muda pra quem chama).
- Produces: `decideBotTurn` agora tenta `generate(prompt)` até 2 vezes (1 retry) antes de cair no handoff — comportamento observável só nos testes (via contagem de chamadas ao `generate` injetado).

- [ ] **Step 1: Escrever os testes de retry (adicionar ao final de `describe('decideBotTurn', ...)` em `conversational-bot.test.ts`)**

```typescript
  it('tenta de novo uma vez quando a IA falha na primeira tentativa, e usa o resultado da segunda', async () => {
    let calls = 0
    const generate = async () => {
      calls++
      if (calls === 1) throw new Error('falha de rede transitória')
      return JSON.stringify({ reply: 'Oi! (segunda tentativa)', extracted_facts: {}, handoff: false, done: false })
    }
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(calls).toBe(2)
    expect(result.reply).toBe('Oi! (segunda tentativa)')
    expect(result.handoff).toBe(false)
  })

  it('cai pro fallback só depois de falhar nas duas tentativas (não em loop infinito)', async () => {
    let calls = 0
    const generate = async () => {
      calls++
      throw new Error('fora do ar')
    }
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(calls).toBe(2)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })
```

- [ ] **Step 2: Rodar os testes novos e confirmar que falham**

Run: `npx vitest run src/lib/conversational-bot.test.ts`
Expected: FAIL nos 2 testes novos — `calls` vem `1`, não `2` (ainda não tenta de novo).

- [ ] **Step 3: Implementar o retry em `decideBotTurn`**

Em `src/lib/conversational-bot.ts`, troca o corpo da função (linhas 163-172 na versão atual):

```typescript
export async function decideBotTurn(
  roteiro: string,
  knownFacts: string,
  capturedFacts: Record<string, string>,
  history: ConversationMessage[],
  incomingText: string,
  handoffMessage: string = HANDOFF_FALLBACK_MESSAGE,
  generate: GenerateFn = defaultGenerate,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<BotTurn> {
  const prompt = buildTurnPrompt(roteiro, knownFacts, capturedFacts, history, incomingText)

  // 1 retry automático em falha de timeout/rede antes de cair no handoff
  // determinístico — nunca depende da IA "lembrar" de responder. Falha de
  // JSON inválido não passa por aqui (parseTurn trata isso sem lançar
  // erro), só falha de chamada externa mesmo.
  try {
    const raw = await withTimeout(generate(prompt), timeoutMs)
    return parseTurn(raw, knownFacts, handoffMessage)
  } catch (firstErr) {
    console.error('[conversational-bot] 1ª tentativa falhou, tentando de novo:', firstErr)
  }

  try {
    const raw = await withTimeout(generate(prompt), timeoutMs)
    return parseTurn(raw, knownFacts, handoffMessage)
  } catch (err) {
    console.error('[conversational-bot] turno falhou após retry, escalando:', err)
    return { reply: handoffMessage, extractedFacts: {}, handoff: true, done: false }
  }
}
```

- [ ] **Step 4: Rodar a suite inteira do arquivo e confirmar que tudo passa**

Run: `npx vitest run src/lib/conversational-bot.test.ts`
Expected: PASS (11 testes — os 9 originais continuam passando sem alteração, + 2 novos).

- [ ] **Step 5: Checar tipos**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erro em `conversational-bot.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/conversational-bot.ts src/lib/conversational-bot.test.ts
git commit -m "feat: retry automatico na chamada ao Gemini antes do handoff"
```

---

### Task 4: Retry + log estruturado no envio pra Evolution API

**Files:**
- Modify: `src/lib/evolution.ts:39-61` (`sendWhatsAppText`) e `:91-123` (`sendWhatsAppImage`)

**Interfaces:**
- Consumes: nada novo.
- Produces: mesma assinatura pública de `sendWhatsAppText`/`sendWhatsAppImage` — comportamento muda (1 retry + log antes de lançar erro), mas quem chama (todos os call sites: `bot-engine.ts`, `appointment-automation.ts`, `followups/route.ts`, `campaigns.ts`, `whatsapp-health/route.ts`, `evolution-selfheal/route.ts`) não precisa mudar nada.

- [ ] **Step 1: Adicionar helper de retry compartilhado e usar nas duas funções**

Em `src/lib/evolution.ts`, adiciona antes de `sendWhatsAppText` (depois de `logGhostSocketIncident`):

```typescript
// 1 retry automático em falha de rede/status não-2xx antes de desistir —
// toda falha (mesmo depois do retry) fica logada, nunca engolida em
// silêncio (aconteceu: falha de envio sumia sem log nenhum no catch do
// webhook do Chatwoot).
async function postToEvolution(config: EvolutionConfig, path: string, body: unknown): Promise<Response> {
  const attempt = () =>
    fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  let res = await attempt()
  if (!res.ok) {
    console.error(`[evolution] POST ${path} falhou (status ${res.status}) na 1ª tentativa, tentando de novo`)
    res = await attempt()
  }
  return res
}
```

Troca o corpo de `sendWhatsAppText`:

```typescript
export async function sendWhatsAppText(config: EvolutionConfig, phone: string, text: string): Promise<void> {
  const number = normalizePhone(phone)
  if (!number) throw new Error('Telefone inválido.')

  const res = await postToEvolution(config, `/message/sendText/${config.instanceName}`, { number, text })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[evolution] envio de texto falhou definitivamente (${config.instanceName}): ${res.status} ${body}`)
    await logGhostSocketIncident(config.instanceName, body)
    throw new Error(`Evolution API ${res.status}: ${body}`)
  }
}
```

Troca o corpo de `sendWhatsAppImage`:

```typescript
export async function sendWhatsAppImage(
  config: EvolutionConfig,
  phone: string,
  imageDataUrl: string,
  caption?: string
): Promise<void> {
  const number = normalizePhone(phone)
  if (!number) throw new Error('Telefone inválido.')

  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')

  const res = await postToEvolution(config, `/message/sendMedia/${config.instanceName}`, {
    number,
    mediatype: 'image',
    mimetype: 'image/png',
    media: base64,
    fileName: 'pix-qrcode.png',
    caption,
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[evolution] envio de imagem falhou definitivamente (${config.instanceName}): ${res.status} ${body}`)
    await logGhostSocketIncident(config.instanceName, body)
    throw new Error(`Evolution API ${res.status}: ${body}`)
  }
}
```

- [ ] **Step 2: Rodar a suite inteira de testes**

Run: `npx vitest run`
Expected: PASS em todos os arquivos (nenhum teste existente cobre `evolution.ts` diretamente hoje, então nada deve quebrar).

- [ ] **Step 3: Checar tipos**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erro em `evolution.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/evolution.ts
git commit -m "feat: retry + log estruturado no envio pra Evolution API"
```

---

### Task 5: Integrar o lock no webhook do Chatwoot

**Files:**
- Modify: `src/app/api/webhooks/chatwoot/route.ts:1-15` (imports) e `:127-147` (bloco do bot)

**Interfaces:**
- Consumes: `acquireContactLock`, `releaseContactLock` de `@/lib/contact-lock` (Task 2); `resolveTemplate` de `@/lib/message-templates`; `HANDOFF_FALLBACK_MESSAGE` de `@/lib/conversational-bot`.
- Produces: nenhuma interface nova exportada — é o ponto de integração final.

- [ ] **Step 1: Atualizar os imports no topo do arquivo**

```typescript
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmAppointment, cancelAppointment, findPendingAppointmentByPhone } from '@/lib/appointment-automation'
import { getBotReply, markEscalatedIfHumanSent } from '@/lib/bot-engine'
import { markCampaignRecipientResponded } from '@/lib/campaigns'
import { sendWhatsAppText } from '@/lib/evolution'
import { isExistingClient } from '@/lib/existing-client'
import { acquireContactLock, releaseContactLock } from '@/lib/contact-lock'
import { resolveTemplate } from '@/lib/message-templates'
import { HANDOFF_FALLBACK_MESSAGE } from '@/lib/conversational-bot'
```

- [ ] **Step 2: Substituir o bloco que chama o bot**

Troca o bloco atual (a partir do comentário `// Sem consulta pendente...` até o fechamento do `if (tenant.bot_enabled...)`) por:

```typescript
  // Sem consulta pendente pra confirmar/cancelar — passa pro bot de
  // primeiro contato (fluxo linear por template; a IA só humaniza o texto
  // de cada estágio, não decide o fluxo). Quem já é cliente cadastrado não
  // recebe o discurso de "lead novo", mas ainda recebe um aviso de
  // recebimento (ver getBotReply) — nunca silêncio total sem explicação.
  //
  // Lock por contato (tenant_id + phone) serializa mensagens seguidas do
  // MESMO contato — sem isso, duas mensagens quase simultâneas rodam a IA
  // em paralelo e a que perde a corrida de gravação em conversation_state
  // é descartada em silêncio (bug confirmado em produção). Contatos
  // diferentes nunca esperam um pelo outro.
  if (tenant.bot_enabled && tenant.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    const evolutionConfig = {
      baseUrl: tenant.evolution_base_url,
      apiKey: tenant.evolution_api_key,
      instanceName: tenant.evolution_instance_name,
    }

    const locked = await acquireContactLock(tenant.id, phone)
    if (!locked) {
      // Orçamento de espera pelo lock estourou (fila desse contato
      // específico muito cheia) — desiste de esperar a vez e manda a
      // mensagem de ausência direto, sem chamar a IA. Fallback puramente
      // determinístico, nunca fica em silêncio.
      console.error(`[chatwoot-webhook] lock ocupado além do orçamento de espera: tenant=${tenant.id} phone=${phone}`)
      try {
        const fallback = await resolveTemplate(tenant.id, 'escalar_atendimento_humano', {}, HANDOFF_FALLBACK_MESSAGE)
        await sendWhatsAppText(evolutionConfig, phone, fallback)
      } catch (e) {
        console.error('[chatwoot-webhook] falha ao mandar fallback de lock ocupado:', e)
      }
      return NextResponse.json({ ok: true })
    }

    try {
      const alreadyClient = await isExistingClient(tenant.id, phone)
      const reply = await getBotReply(tenant, phone, content, alreadyClient)
      if (reply) {
        await sendWhatsAppText(evolutionConfig, phone, reply)
      }
    } catch (e) {
      // Falha do bot não deve derrubar o webhook — mensagem original do
      // paciente já chegou no Chatwoot normalmente, humano pode assumir.
      console.error('[chatwoot-webhook] erro processando mensagem do bot:', e)
    } finally {
      await releaseContactLock(tenant.id, phone)
    }
  }
```

- [ ] **Step 3: Checar tipos**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erro em `route.ts`.

- [ ] **Step 4: Rodar a suite inteira de testes**

Run: `npx vitest run`
Expected: PASS em todos os arquivos.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/webhooks/chatwoot/route.ts
git commit -m "feat: lock por contato no webhook do chatwoot, nunca mais descarta mensagem em silencio"
```

---

### Task 6: Deploy e validação real

**Files:** nenhum arquivo novo — validação operacional.

- [ ] **Step 1: Deploy pra produção**

Run: `cd "C:\Users\cauer\Desktop\NexHub" && vercel --prod --yes`
Expected: `"readyState": "READY"`, `"target": "production"`.

- [ ] **Step 2: Confirmar que a tabela `contact_locks` está vazia (nenhum lock preso da migration)**

Run: `curl -s "https://mbgndoxqntynapfwatim.supabase.co/rest/v1/contact_locks?select=*" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"`
Expected: `[]`

- [ ] **Step 3: Validação manual — mandar 2-3 mensagens seguidas rapidamente pro WhatsApp da Clínica Auris (número de teste já configurado)**

Confirma no `conversation_state` que TODAS as mensagens aparecem em `messages` com resposta do bot correspondente, nenhuma foi descartada:

Run: `curl -s "https://mbgndoxqntynapfwatim.supabase.co/rest/v1/conversation_state?tenant_id=eq.006c5168-70e5-487c-8e09-acecae16251a&select=messages" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"`
Expected: cada mensagem `paciente` enviada tem uma mensagem `bot` logo depois (ou uma resposta de handoff/fallback) — nenhuma mensagem do paciente aparece "órfã" sem resposta.

- [ ] **Step 4: Confirmar que o lock foi liberado depois do processamento**

Run: `curl -s "https://mbgndoxqntynapfwatim.supabase.co/rest/v1/contact_locks?select=*" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"`
Expected: `[]` (nenhum lock preso depois que as mensagens de teste terminaram de processar).
