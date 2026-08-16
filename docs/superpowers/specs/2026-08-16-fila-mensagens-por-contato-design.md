# Fila de mensagens por contato (lock de processamento) + nunca reiniciar conversa com histórico

## Contexto

Bug relatado: cliente manda várias mensagens seguidas ("insistência") e o bot para de responder — sem log, sem fallback, sem explicação. Suspeita inicial era que a IA "esquecia" de responder, o que motivou uma proposta de migração completa pra n8n (fila + máquina de estado + timeout fora da IA).

Investigação encontrou a causa raiz real, sem precisar da migração:

`bot-engine.ts` já protege `conversation_state` contra escrita concorrente via `saveConversationStateIfUnchanged` (comparação otimista contra `updated_at`). Quando duas mensagens do mesmo contato chegam quase juntas, o Chatwoot dispara dois webhooks quase simultâneos, cada um roda `getBotReply` em paralelo — os dois leem o mesmo estado inicial, os dois chamam o Gemini, e **quem grava primeiro vence**; quem perde a corrida recebe `saved === false` e `getBotReply` retorna `null` — a resposta gerada pra essa mensagem é descartada, sem retry, sem fila, sem aviso. Isso bate exatamente com o sintoma relatado.

O fallback de timeout (8s) e a mensagem de handoff **já são determinísticos** (`withTimeout` em `conversational-bot.ts`, sem depender da IA "lembrar" de nada) — não é aí que está o problema.

## Objetivo

Fechar esse buraco específico sem trocar a arquitetura (Evolution API, Chatwoot, Gemini, roteiro e lógica de handoff continuam como estão), com um desenho que aguenta alta escala (múltiplos tenants, dezenas de contatos simultâneos por tenant).

Requisito adicional do dono: contato que já tem histórico de conversa **nunca** pode ser tratado como atendimento novo — a IA deve sempre reconhecer o histórico existente antes de decidir o que responder.

## Fora de escopo

- Migração pra n8n (avaliada e descartada pra esse problema — ver discussão na conversa).
- Mudar o motor de IA, o roteiro, ou a lógica de handoff/escalação já existentes.
- Fila cross-contato (contatos diferentes nunca precisam serializar entre si).

## Design

### 1. Lock de processamento por contato (`contact_locks`)

Nova tabela:

```sql
create table contact_locks (
  tenant_id uuid references tenants(id) not null,
  contact_phone text not null,
  locked_at timestamptz not null default now(),
  primary key (tenant_id, contact_phone)
);
```

Por que uma tabela de claim em vez de `pg_advisory_lock`: locks consultivos do Postgres exigem uma conexão de sessão mantida aberta durante todo o processamento; como o acesso ao banco aqui é via PostgREST (`@supabase/supabase-js`), cada chamada é sua própria transação isolada — o lock morreria antes do processamento (chamada ao Gemini, envio WhatsApp) terminar. Uma tabela com `primary key` dá a mesma exclusão mútua atômica (constraint única = claim atômico) usando só o client que já existe no projeto, sem driver novo.

### 2. Fluxo de claim/release

No início do processamento de uma mensagem `incoming` (webhook do Chatwoot, `route.ts`, antes de chamar `getBotReply`):

1. Tenta `insert` em `contact_locks` pra `(tenant_id, phone)`.
   - **Sucesso** → tem a vez. Segue o processamento normal.
   - **Falha por violação de unique** → outra mensagem do mesmo contato está sendo processada agora. Entra em espera (poll a cada ~300ms, checando se o lock sumiu).
2. Ao terminar de processar (sucesso ou erro — bloco `finally`), `delete` do lock.
3. **Lock parado (invocação anterior crashou sem liberar)**: se ao tentar dar poll o lock encontrado tem `locked_at` mais velho que ~20s, trata como morto — apaga e tenta o claim de novo. Isso garante que nenhuma trava depende da IA ou de qualquer processo "lembrar" de liberar.
4. **Budget de espera**: se passar ~9s esperando (fila desse contato específico muito cheia, cenário raro), desiste de esperar a vez e manda a mensagem de ausência (`escalar_atendimento_humano`) diretamente, sem chamar o Gemini — fallback puramente determinístico.

Contatos diferentes nunca competem pelo mesmo lock (`primary key` é por `tenant_id + contact_phone`), então isso escala em paralelo sem limite prático entre tenants/contatos — só serializa mensagens do **mesmo** contato entre si, que é exatamente o cenário do bug.

### 3. Nunca reiniciar conversa com histórico existente

Já parcialmente garantido hoje (`conversation_state` persiste `messages`/`captured_data` por telefone, e a IA recebe o histórico completo em todo turno via `buildTurnPrompt`). O que muda com o lock: como agora toda mensagem do mesmo contato processa em sequência garantida (nunca mais em paralelo puro), a leitura do estado no início de cada processamento **sempre** reflete a última mensagem já respondida — elimina o único jeito de isso "vazar" pra IA (duas leituras concorrentes do mesmo estado desatualizado). Nenhuma mudança de schema adicional necessária pra esse requisito — ele já era garantido pela lógica existente, o lock só fecha a lacuna que permitia burlar isso sob concorrência.

### 4. Retry + log estruturado em chamada externa

- **Gemini**: 1 retry automático em falha de timeout/rede (não em falha de parse — isso já indica resposta chegou, só não é JSON válido, retry não ajudaria) antes de cair no handoff determinístico. Loga a falha (`console.error` estruturado, já existe padrão parecido em `conversational-bot.ts`).
- **Envio WhatsApp (Evolution API)**: 1 retry automático em falha de rede/5xx antes de desistir. Hoje a falha é **engolida sem log nenhum** no `catch` do webhook — corrigido pra logar sempre, mesmo quando o retry também falha.

## Testes

- Teste de unidade pro claim/release (insert conflita quando já existe linha; delete libera; lock com `locked_at` velho é considerado morto).
- Teste de integração simulando duas mensagens quase simultâneas do mesmo contato — confirma que a segunda não é descartada, processa em sequência com o histórico da primeira já incluído.
- Teste confirmando que contatos diferentes nunca esperam um pelo outro.

## Rollout

1. Migration (nova tabela).
2. Código do lock + retry + log.
3. Deploy em produção (mesmo fluxo manual já usado: `vercel --prod`).
4. Validar com o teste real em andamento (Clínica Auris) antes de considerar fechado.
