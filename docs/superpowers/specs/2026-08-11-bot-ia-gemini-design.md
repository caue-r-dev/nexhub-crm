# Bot de primeiro contato: IA (Gemini Flash) + fix de sessão expirada

## Contexto

O bot de primeiro contato (`src/lib/bot-engine.ts`) hoje é uma máquina de estados linear sem IA (decisão anterior: fluxo previsível não precisava de LLM). Dois problemas motivaram esta mudança:

1. **Mensagens confusas / tom robótico**: respostas são sempre o texto fixo do template, sem se adaptar ao que o paciente escreveu.
2. **Bug de sessão**: `conversation_state` nunca expira. Uma conversa de teste de um dia anterior continua de onde parou, mesmo que o paciente (ou o próprio usuário testando) tenha "recomeçado" no dia seguinte.

## Objetivo

Adicionar uma camada de IA (Gemini Flash) que reescreve a resposta de cada estágio de forma natural, **sem sair do roteiro personalizado de cada clínica** (`message_templates`). A IA não decide o conteúdo — só humaniza o texto que o roteiro já define. Junto, corrigir a expiração de sessão.

## Fora de escopo

- Não muda a lógica de avanço de estágio: qualquer mensagem recebida ainda avança para o próximo estágio (comportamento atual, mantido por decisão do usuário).
- Não substitui a máquina de estágios (`STAGES`) por decisão livre da IA.
- Não cobre outros fluxos de mensagem (confirmação de agendamento, follow-up de falta/atraso) — só o bot de primeiro contato.

## Design

### 1. Expiração de sessão (12h)

Em `getConversationState` (`src/lib/bot-engine.ts`): ao ler a linha de `conversation_state`, comparar `updated_at` com `now()`. Se a diferença for maior que 12h, tratar como conversa nova:

```
current_stage: 'primeiro_contato'
captured_data: {}
```

em vez do valor salvo. Não precisa de migration — a coluna `updated_at` já existe na tabela (default `now()`, atualizada em todo `saveConversationState`).

### 2. IA como humanizador (Gemini Flash)

Novo arquivo `src/lib/ai-reply.ts`, expondo algo como:

```ts
export async function humanizeReply(
  scriptText: string,
  incomingText: string,
): Promise<string>
```

Fluxo dentro de `getBotReply` (`bot-engine.ts`):

1. Resolve o texto do estágio via `resolveTemplate` (como hoje) — esse é o roteiro personalizado do tenant, fonte da verdade de conteúdo.
2. Passa `scriptText` + `incomingText` (mensagem que o paciente acabou de mandar) para `humanizeReply`.
3. Gemini reescreve o texto de forma natural, respondendo ao que o paciente disse, mas **sem alterar fatos** (valores, horários, links, nomes) e **sem responder nada fora do conteúdo do `scriptText`**.
4. Retorna o texto reescrito no lugar do texto fixo.

Prompt (system/instrução) usado na chamada:

> "Reescreva a mensagem abaixo de forma natural, respondendo à última mensagem do paciente. NÃO adicione, remova ou altere fatos (valores, horários, links, nomes). Não responda nada fora desse conteúdo. Devolva só o texto final da mensagem, sem comentários."

### 3. Fallback

`humanizeReply` chama a API do Gemini com timeout de ~5s dentro de um try/catch. Qualquer erro (timeout, rate limit, chave inválida, resposta vazia) → retorna `scriptText` sem modificação (comportamento atual, texto fixo do template). O fluxo do bot nunca quebra por falha da IA.

### 4. Configuração

- Nova env var `GEMINI_API_KEY` (obrigatória para a IA funcionar; se ausente, `humanizeReply` já cai no fallback do texto fixo).
- Opcional `GEMINI_MODEL` (default: modelo Flash mais recente disponível).
- Adicionar em `.env.local` e nas env vars do projeto na Vercel.
- Nova dependência: SDK oficial do Gemini (`@google/generative-ai` ou equivalente atual).

### 5. Testes

- Unitário: `getConversationState` reseta corretamente quando `updated_at` > 12h; mantém estado quando dentro da janela.
- Unitário: `humanizeReply` retorna o `scriptText` original quando a chamada à API falha/lança/expira timeout.
- Manual: fluxo completo via WhatsApp de teste, incluindo cenário do bug relatado (conversa de ontem não deve continuar hoje).

## Arquivos afetados

- `src/lib/bot-engine.ts` (expiração de sessão + chamada ao humanizador)
- `src/lib/ai-reply.ts` (novo)
- `.env.local`, Vercel env vars
- `package.json` (nova dependência)
