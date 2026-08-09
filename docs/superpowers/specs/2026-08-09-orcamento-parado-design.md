# Task 2 — Recuperação automática de orçamento parado

Data: 2026-08-09
Status: aprovado, pronto pra plano de implementação

## Objetivo

Reativar orçamento que não fechou sem ação manual da secretária: se um orçamento fica parado (sem aprovar, sem recusar) por alguns dias, o sistema manda automaticamente uma mensagem de WhatsApp pro paciente perguntando se pode ajudar a agendar.

## Escopo

- Marcar orçamento como "recusado" manualmente (não existe hoje — só existe "aprovado")
- Cron que varre orçamentos parados e dispara WhatsApp em 2 momentos: dia 3 e dia 7 após criação
- Mensagem com nome do paciente + valor do orçamento + CTA, customizável por clínica (com padrão pronto)
- Parar de disparar automaticamente se status virar aprovado ou recusado — checado toda vez que o cron roda, não precisa de lógica extra além de filtrar por `approved_at is null and declined_at is null`

## Fora de escopo (não-goals desta v1)

- Dias de disparo configuráveis por tenant (fixos: dia 3 e dia 7)
- Mais de 2 tentativas
- Cancelar/editar orçamento pelo próprio paciente via link (não pedido)
- Aprovar/recusar orçamento pelo WhatsApp (resposta livre do paciente) — só a secretária marca pela UI nesta v1

## Schema (novo)

### `treatment_budgets` — novas colunas
- `declined_at timestamptz` — null = ainda não recusado. Setado pela secretária clicando "Marcar como recusado"
- `followup_day3_sent_at timestamptz` — null até a 1ª mensagem ser enviada
- `followup_day7_sent_at timestamptz` — null até a 2ª mensagem ser enviada

### `tenants` — novas colunas
- `budget_followup_message_day3 text` — template customizável, null = usa padrão
- `budget_followup_message_day7 text` — idem

Variáveis de template: `{{nome}}` (primeiro nome do cliente), `{{valor}}` (total do orçamento formatado em R$), `{{clinica}}` (nome do tenant) — mesmo padrão de `{{nome}}/{{data}}/{{hora}}/{{clinica}}` já usado nos lembretes de consulta.

Mensagem padrão dia 3 (se tenant não customizar): "Olá {{nome}}! Vi que seu orçamento de {{valor}} na {{clinica}} ainda tá em aberto. Posso te ajudar a agendar?"
Mensagem padrão dia 7: "Olá {{nome}}! Seu orçamento de {{valor}} na {{clinica}} continua disponível. Quer que eu já deixe seu horário marcado?"

## Componentes / arquivos

### Novos
- `src/app/api/automations/budget-followup/route.ts` — POST, cron n8n (mesmo padrão `x-api-key`, roda 1x por dia — granularidade de dia inteiro, diferente do cron de lembrete de consulta que roda a cada ~15min), varre `treatment_budgets` parados e dispara
- `src/components/orcamentos/DeclineBudgetButton.tsx` — botão "Marcar como recusado"

### Alterados
- `src/app/actions/treatment-budgets.ts` — nova action `declineBudgetAction(id, clientId)`, seta `declined_at`
- `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx` — mostra `DeclineBudgetButton` ao lado do `ApproveBudgetButton` quando `!approved_at && !declined_at`; mostra "Recusado" (cor de status cancelado) quando `declined_at` setado
- `src/app/(dashboard)/configuracoes/lembretes/page.tsx` (ou onde já configuram `reminder_message_24h`/`2h`) — adiciona os 2 campos novos de template de orçamento parado
- `src/lib/supabase/types.ts` — novos campos

## Fluxo de dados (cron)

1. n8n chama `POST /api/automations/budget-followup` com `x-api-key`
2. Endpoint (admin client, varre todos os tenants):
   a. Busca `treatment_budgets` com `approved_at is null`, `declined_at is null`, join `clients(name, phone)` e `tenants(...)`
   b. Pra cada orçamento: calcula dias desde `created_at`
      - Se `>= 3 dias` e `followup_day3_sent_at is null` → manda mensagem dia 3, marca `followup_day3_sent_at`
      - Senão se `>= 7 dias` e `followup_day7_sent_at is null` → manda mensagem dia 7, marca `followup_day7_sent_at`
   c. Se `client.phone` ou config de WhatsApp do tenant faltando, pula e loga (mesmo padrão do cron de lembrete)
3. Um orçamento que vira aprovado ou recusado entre os disparos simplesmente não aparece mais na próxima varredura (filtro do passo a) — nenhum estado extra de "parar" precisa ser gerenciado

## Tratamento de erro

- Falha no envio do WhatsApp (Evolution API fora do ar): não marca `followup_dayN_sent_at`, tenta de novo na próxima execução do cron (mesmo padrão do lembrete de consulta)
- Cliente sem telefone: pula, loga no resultado do endpoint, não quebra o loop
- Tenant sem `evolution_base_url`/`api_key`/`instance_name`: pula, loga

## Testes

- Endpoint segue o mesmo padrão sem testes automatizados de `/api/automations/reminders` (decisão de escopo já estabelecida no projeto — sem harness de teste pra API routes)
- `declineBudgetAction`: sem teste unitário dedicado (server action simples, mesmo padrão de `approveBudgetAction` que também não tem)
