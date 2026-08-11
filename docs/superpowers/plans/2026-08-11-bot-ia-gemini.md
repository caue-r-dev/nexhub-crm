# Bot IA (Gemini Flash) + fix sessão expirada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o bot de primeiro contato (a) esquecer conversas com mais de 12h paradas e (b) reescrever a resposta de cada estágio via Gemini Flash de forma natural, sem sair do roteiro (`message_templates`) de cada tenant.

**Architecture:** `bot-engine.ts` ganha uma função pura `isSessionExpired` usada dentro de `getConversationState` pra descartar estado velho. Novo `ai-reply.ts` expõe `humanizeReply(scriptText, incomingText)`: manda o texto do roteiro + mensagem do paciente pro Gemini reescrever, com timeout e fallback pro texto original em qualquer falha. `getBotReply` passa a chamar `humanizeReply` no texto resolvido antes de retornar.

**Tech Stack:** Next.js/TypeScript existente, Vitest (já configurado, `npm test` = `vitest run`), SDK `@google/generative-ai`.

## Global Constraints

- Sessão expira em 12h sem atualização (spec, seção 1).
- IA nunca altera fatos do roteiro (valores, horários, links, nomes) nem responde fora do conteúdo do template (spec, seção 2).
- Qualquer falha da IA (erro, timeout, resposta vazia) cai pro texto fixo do template — bot nunca trava por causa da IA (spec, seção 3).
- Lógica de avanço de estágio (qualquer mensagem avança) não muda (spec, "fora de escopo").
- Timeout da chamada Gemini: ~5s (spec, seção 3).

---

### Task 1: Expiração de sessão (12h)

**Files:**
- Modify: `src/lib/bot-engine.ts` (função `getConversationState`, linhas 56-66 hoje)
- Test: `src/lib/bot-engine.test.ts` (novo)

**Interfaces:**
- Produces: `export function isSessionExpired(updatedAt: string | null, now: Date, maxHours?: number): boolean` — usado por `getConversationState` nesta task, e disponível pra outras tasks se precisarem.

- [ ] **Step 1: Write the failing test**

Criar `src/lib/bot-engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isSessionExpired } from './bot-engine'

describe('isSessionExpired', () => {
  it('retorna false quando updatedAt é null (sessão nunca salva)', () => {
    expect(isSessionExpired(null, new Date('2026-08-11T12:00:00-03:00'))).toBe(false)
  })

  it('retorna false quando dentro da janela de 12h', () => {
    const updatedAt = '2026-08-11T08:00:00-03:00'
    const now = new Date('2026-08-11T12:00:00-03:00')
    expect(isSessionExpired(updatedAt, now)).toBe(false)
  })

  it('retorna true quando passou de 12h', () => {
    const updatedAt = '2026-08-10T08:00:00-03:00'
    const now = new Date('2026-08-11T12:00:00-03:00')
    expect(isSessionExpired(updatedAt, now)).toBe(true)
  })

  it('respeita maxHours customizado', () => {
    const updatedAt = '2026-08-11T10:00:00-03:00'
    const now = new Date('2026-08-11T12:00:00-03:00')
    expect(isSessionExpired(updatedAt, now, 1)).toBe(true)
    expect(isSessionExpired(updatedAt, now, 3)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- bot-engine.test.ts`
Expected: FAIL — `isSessionExpired` não existe em `bot-engine.ts` (erro de import/undefined).

- [ ] **Step 3: Implement `isSessionExpired` and wire into `getConversationState`**

Em `src/lib/bot-engine.ts`, adicionar a função exportada (antes de `getConversationState`) e ajustar `getConversationState` pra usar `updated_at` e aplicar o reset:

```ts
export function isSessionExpired(updatedAt: string | null, now: Date, maxHours = 12): boolean {
  if (!updatedAt) return false
  const elapsedMs = now.getTime() - new Date(updatedAt).getTime()
  return elapsedMs > maxHours * 60 * 60 * 1000
}

async function getConversationState(tenantId: string, phone: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('conversation_state')
    .select('current_stage, captured_data, updated_at')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  const fresh = { current_stage: 'primeiro_contato' as string, captured_data: {} as Record<string, unknown> }
  if (!data || isSessionExpired(data.updated_at, new Date())) return fresh

  return { current_stage: data.current_stage, captured_data: data.captured_data as Record<string, unknown> }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- bot-engine.test.ts`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/bot-engine.ts src/lib/bot-engine.test.ts
git commit -m "fix: expira conversation_state parado há mais de 12h"
```

---

### Task 2: `humanizeReply` — reescrita via Gemini com fallback

**Files:**
- Create: `src/lib/ai-reply.ts`
- Test: `src/lib/ai-reply.test.ts`
- Modify: `package.json` (dependência nova)

**Interfaces:**
- Produces: `export type GenerateFn = (prompt: string) => Promise<string>`
- Produces: `export function buildPrompt(scriptText: string, incomingText: string): string`
- Produces: `export async function humanizeReply(scriptText: string, incomingText: string, generate?: GenerateFn, timeoutMs?: number): Promise<string>` — usado pela Task 3.

- [ ] **Step 1: Install dependency**

```bash
npm install @google/generative-ai
```

- [ ] **Step 2: Write the failing tests**

Criar `src/lib/ai-reply.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPrompt, humanizeReply } from './ai-reply'

describe('buildPrompt', () => {
  it('inclui o texto do roteiro e a mensagem do paciente', () => {
    const prompt = buildPrompt('Olá! Bem-vindo(a) à Clínica X.', 'oi, quero marcar')
    expect(prompt).toContain('Olá! Bem-vindo(a) à Clínica X.')
    expect(prompt).toContain('oi, quero marcar')
    expect(prompt).toContain('NÃO adicione, remova ou altere fatos')
  })
})

describe('humanizeReply', () => {
  it('retorna o texto gerado quando a IA responde a tempo', async () => {
    const generate = async () => '  Oi! Bem-vindo à Clínica X, que bom te ver por aqui!  '
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate)
    expect(result).toBe('Oi! Bem-vindo à Clínica X, que bom te ver por aqui!')
  })

  it('cai pro texto original quando a IA lança erro', async () => {
    const generate = async () => { throw new Error('rate limit') }
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate)
    expect(result).toBe('Olá! Bem-vindo(a) à Clínica X.')
  })

  it('cai pro texto original quando a IA estoura o timeout', async () => {
    const generate = () => new Promise<string>((resolve) => setTimeout(() => resolve('tarde demais'), 50))
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate, 10)
    expect(result).toBe('Olá! Bem-vindo(a) à Clínica X.')
  })

  it('cai pro texto original quando a IA retorna string vazia', async () => {
    const generate = async () => '   '
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate)
    expect(result).toBe('Olá! Bem-vindo(a) à Clínica X.')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- ai-reply.test.ts`
Expected: FAIL — `./ai-reply` não existe.

- [ ] **Step 4: Implement `src/lib/ai-reply.ts`**

```ts
// Reescreve o texto do roteiro de forma natural via Gemini Flash, sem sair
// do conteúdo definido pelo tenant. Qualquer falha (erro, timeout, resposta
// vazia) devolve o texto original do roteiro — o bot nunca trava por causa
// da IA.
import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_TIMEOUT_MS = 5000

export type GenerateFn = (prompt: string) => Promise<string>

export function buildPrompt(scriptText: string, incomingText: string): string {
  return `Reescreva a mensagem abaixo de forma natural, respondendo à última mensagem do paciente. NÃO adicione, remova ou altere fatos (valores, horários, links, nomes). Não responda nada fora desse conteúdo. Devolva só o texto final da mensagem, sem comentários.

Mensagem do paciente: "${incomingText}"

Texto do roteiro: "${scriptText}"`
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function defaultGenerate(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function humanizeReply(
  scriptText: string,
  incomingText: string,
  generate: GenerateFn = defaultGenerate,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  try {
    const text = await withTimeout(generate(buildPrompt(scriptText, incomingText)), timeoutMs)
    const trimmed = text?.trim()
    return trimmed || scriptText
  } catch {
    return scriptText
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- ai-reply.test.ts`
Expected: PASS (5 testes)

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai-reply.ts src/lib/ai-reply.test.ts package.json package-lock.json
git commit -m "feat: humanizeReply reescreve texto do roteiro via Gemini com fallback"
```

---

### Task 3: Ligar `humanizeReply` no `getBotReply`

**Files:**
- Modify: `src/lib/bot-engine.ts` (linha final de `getBotReply`, hoje `return resolveTemplate(...)`)

**Interfaces:**
- Consumes: `humanizeReply(scriptText: string, incomingText: string): Promise<string>` (Task 2)

- [ ] **Step 1: Import e trocar o retorno final**

Em `src/lib/bot-engine.ts`, adicionar import:

```ts
import { humanizeReply } from '@/lib/ai-reply'
```

E trocar a última linha de `getBotReply` (hoje `return resolveTemplate(tenant.id, nextStage, context, DEFAULTS[nextStage])`) por:

```ts
  const scriptText = await resolveTemplate(tenant.id, nextStage, context, DEFAULTS[nextStage])
  return humanizeReply(scriptText, incomingText)
}
```

- [ ] **Step 2: Rodar suite completa pra garantir que nada quebrou**

Run: `npm test`
Expected: todos os testes existentes + os novos passam (nenhum teste cobre `getBotReply` diretamente — depende de DB, fora de escopo de unit test; validação é manual, ver Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/lib/bot-engine.ts
git commit -m "feat: getBotReply passa resposta pelo humanizeReply antes de enviar"
```

---

### Task 4: Config (`GEMINI_API_KEY`) e teste manual end-to-end

**Files:**
- Modify: `.env.example` (documentar novas vars)
- Modify: `.env.local` (usuário adiciona a chave real — não commitado)
- Modify: Vercel env vars (produção — feito pelo usuário no dashboard)

- [ ] **Step 1: Documentar vars no `.env.example`**

```
ADMIN_PIX_KEY=""
ADMIN_PIX_RECEIVER_NAME=""
GEMINI_API_KEY=""
GEMINI_MODEL=""
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: documenta GEMINI_API_KEY e GEMINI_MODEL no .env.example"
```

- [ ] **Step 3: Usuário adiciona a chave real**

Usuário roda no terminal (fora do agente, chave é secreta):
- Pega a chave em https://aistudio.google.com/apikey
- Adiciona `GEMINI_API_KEY=<chave>` em `.env.local` (raiz do projeto)
- Adiciona a mesma var (+ `GEMINI_MODEL` se quiser fixar um modelo específico) nas Environment Variables do projeto na Vercel

- [ ] **Step 4: Teste manual — bug de sessão**

1. Rodar `npm run dev`, mandar mensagem de teste pro WhatsApp do bot, avançar 1-2 estágios.
2. Editar manualmente `conversation_state.updated_at` daquele registro no Supabase pra uma data > 12h atrás (SQL Editor: `update conversation_state set updated_at = now() - interval '13 hours' where contact_phone = '<numero de teste>'`).
3. Mandar nova mensagem de teste.
4. Esperado: bot recomeça do zero, não continua do estágio salvo — na prática responde com a mensagem de `pergunta_queixa` (não `primeiro_contato`), por um bug pré-existente e fora de escopo desta feature: `primeiro_contato` nunca é a mensagem efetivamente enviada, `getBotReply` já pula direto pro próximo estágio na primeira interação também pra contato novo. O que valida o fix aqui é a conversa recomeçar (nova pergunta de queixa, não continuar de onde parou ontem), não qual estágio específico aparece.

- [ ] **Step 5: Teste manual — humanização + fallback**

1. Com `GEMINI_API_KEY` configurada, mandar mensagem de teste completa (4 estágios) e conferir que as respostas variam de tom conforme a mensagem enviada, mas mantêm valores/horários/links corretos (comparar com o texto cru em `/configuracoes/mensagens`).
2. Remover/invalidar temporariamente `GEMINI_API_KEY` (ou renomear a var), repetir o teste: respostas devem ser o texto fixo do template (fallback), sem erro pro paciente.
3. Restaurar `GEMINI_API_KEY`.

## Arquivos afetados (resumo)

- `src/lib/bot-engine.ts` — modificado (expiração de sessão + chamada ao humanizador)
- `src/lib/bot-engine.test.ts` — novo
- `src/lib/ai-reply.ts` — novo
- `src/lib/ai-reply.test.ts` — novo
- `package.json` / `package-lock.json` — nova dependência `@google/generative-ai`
- `.env.example` — documenta `GEMINI_API_KEY`, `GEMINI_MODEL`
