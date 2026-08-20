# Roteiro de continuação pra lead que já teve pré-atendimento

## Contexto

O bot de atendimento (`src/lib/bot-engine.ts`) tinha dois bugs que faziam
lead com histórico de conversa cair de volta no roteiro de "primeiro
contato" (saudação, pergunta de nome) ou ficar em silêncio total:

1. **Fuso horário errado no check de dia fechado** (`isClosedToday` usava
   `Date.getDay()` em hora local do servidor/UTC — perto da virada de dia
   em horário de Brasília, pegava o weekday errado e mandava mensagem de
   ausência com a clínica de fato aberta). Corrigido calculando o weekday
   via `America/Sao_Paulo`.
2. **Sessão expirada (>12h) apagava histórico e escalava pra humano em
   silêncio** — `getConversationState` zerava `messages`/`captured_data`
   e o branch de "contato recorrente" mandava uma mensagem fixa +
   `escalated: true` (silêncio permanente até humano assumir no
   Chatwoot). Removido: sessão expirada agora só reseta `done`/
   `escalated`, preserva histórico.

Com histórico preservado, faltava ainda: mesmo dentro da mesma sessão (ou
depois dela), lead que já tinha dado o nome continuava recebendo o
roteiro completo de "primeiro contato" (4 etapas, incluindo explicar que
precisa de avaliação inicial) em vez de ir direto pro que falta.

## Design

Adiciona uma terceira via de roteiro em `getBotReply`, entre "cliente
cadastrado" (tabela `clients`) e "lead 100% novo":

```
isExistingClient          → roteiro de dúvida pontual (self-service, sem venda)
isKnownLead (novo)         → roteiro de continuação (queixa + disponibilidade)
nenhum dos dois            → roteiro de primeiro contato (4 etapas completas)
```

`isKnownLead = !isExistingClient && !!state.captured_data?.nome` — usa
"já tem nome capturado" como sinal de pré-atendimento, não apenas
`hasHistory` (que pegaria até uma troca isolada tipo "Oi" → mensagem de
ausência, sem conversa de verdade).

### Roteiro de continuação (`CONTINUACAO_STAGES`)

Duas etapas passadas pro `decideBotTurn` (mesmo mecanismo dinâmico do
roteiro de primeiro contato — a IA pula sozinha o que já foi respondido,
olhando o histórico da conversa):

1. **Queixa** — reaproveita o card `pergunta_queixa` já existente e
   editável (mesmo texto do primeiro contato).
2. **Disponibilidade de horário** — repropositado o card `contato_recorrente`
   (antes: mensagem fixa de sessão expirada, hoje sem uso desde a
   remoção do bug #2 acima). Novo texto: perguntar dia/horário preferido
   e avisar que vai checar disponibilidade — **sem** repetir a explicação
   de que precisa passar por avaliação inicial primeiro (já foi dita).

Reaproveitar a chave `contato_recorrente` em vez de criar uma chave nova
evita migração de schema/seed — tenants antigos já têm essa linha em
`message_templates`, só o conteúdo padrão e o label mudam.

### knownFacts

Adicionado fato explícito quando `isKnownLead`: "não cumprimente de novo
nem pergunte o nome, siga direto pro roteiro de continuação" — reforça
pro modelo o que os stages já implicam.

## Fora de escopo

- Regra por clínica de mostrar lista de serviços/valores fixos vs sempre
  negociar após avaliação (mencionado durante a conversa, mas é feature
  maior — fica pra outra sessão).
- Renomear a chave `contato_recorrente` pra algo mais claro (exigiria
  migração; nome ficou desalinhado do propósito atual, documentado em
  comentário no código).
