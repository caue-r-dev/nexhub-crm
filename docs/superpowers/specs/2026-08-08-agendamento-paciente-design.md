# Task 1 — Agendamento pelo próprio paciente

Data: 2026-08-08
Status: aprovado, pronto pra plano de implementação

## Objetivo

Paciente marca consulta sozinho via link público (`nexhub.com.br/agendar/{slug}`), sem depender de secretária pra checar agenda e marcar horário. Consulta só é considerada confirmada após pagamento do sinal (fluxo Pix já existente na secretária), mas o **horário fica reservado desde o submit** (evita duplo agendamento mesmo antes do pagamento).

## Escopo

- Página pública de agendamento por slug do tenant
- Cálculo de disponibilidade real por profissional (horário de trabalho individual − agendamentos existentes − buffer configurável)
- Criação de cliente + agendamento (status pending) direto no submit
- Envio automático de Pix (QR + copia-cola) pro paciente via WhatsApp
- Notificação automática pro tenant (dentista/secretária) de novo agendamento pendente
- Confirmação de pagamento continua manual (secretária clica "marcar como pago" — botão já existe), mas ao confirmar dispara WhatsApp de confirmação pro paciente e o agendamento passa a entrar no fluxo de lembrete 24h/2h já existente automaticamente
- Expiração automática de reserva não paga (libera o slot)

## Fora de escopo (não-goals desta v1)

- Pagamento via webhook de banco/PSP (Pix continua chave estática, confirmação manual)
- Duração de slot por tipo de procedimento (é fixa por tenant nesta v1)
- Janela de agendamento configurável por tenant (fixa em 14 dias)
- Escolha automática de profissional pelo sistema (paciente sempre escolhe)
- Cancelamento/reagendamento pelo próprio paciente (fora desta task)

## Schema (novo)

### `tenants` — novas colunas
- `slug text unique not null` — usado na URL pública, gerado no onboarding ou setado manualmente
- `notification_phone text` — WhatsApp que recebe aviso de novo agendamento
- `slot_duration_minutes integer not null default 30`
- `buffer_minutes integer not null default 0` — intervalo extra entre consultas além da duração do slot
- `booking_hold_minutes integer not null default 120` — quanto tempo a reserva fica válida sem pagamento antes de expirar

### `professional_hours` — nova tabela
```
id uuid pk
professional_id uuid fk -> professionals
tenant_id uuid fk -> tenants
weekday smallint (0=domingo .. 6=sábado)
start_time time
end_time time
created_at timestamptz
```
Múltiplas linhas por profissional (um por dia da semana que atende). RLS por tenant_id igual padrão existente.

### `procedure_types` — nova tabela
```
id uuid pk
tenant_id uuid fk -> tenants
name text not null
active boolean not null default true
created_at timestamptz
```
Lista que a secretária cadastra em configurações; paciente escolhe um na tela pública. Vira `appointments.title`.

### `appointments` — novas colunas
- `booking_expires_at timestamptz` — null se não veio de agendamento público, ou já pago/confirmado. Setado no create, limpo quando `payment_status` vira `confirmado`.
- `source text default 'internal'` — `'internal' | 'public_booking'`, útil pra distinguir origem em relatórios/debug

Colunas já existentes reutilizadas sem alteração: `status` (pending/confirmed/cancelled/done/no_show), `payment_status` (nao_solicitado/aguardando/confirmado), `deposit_amount`, `professional_id`, `client_id`.

## Componentes / arquivos

### Novos
- `src/app/agendar/[slug]/page.tsx` — página pública (fora do route group `(dashboard)`, sem auth), server component que resolve tenant por slug via `createAdminClient()`
- `src/app/agendar/[slug]/BookingFlow.tsx` — client component, wizard: profissional → procedimento → data/hora → dados do paciente
- `src/app/api/public/booking/[slug]/availability/route.ts` — GET, retorna slots livres por profissional/data (usa admin client, endpoint público sem auth mas com validação de input)
- `src/app/api/public/booking/[slug]/route.ts` — POST, cria cliente + appointment + dispara Pix e notificação
- `src/lib/availability.ts` — função pura de cálculo de slots: `professional_hours` − appointments existentes (±buffer) − passado, dado um range de datas
- `src/app/api/automations/expire-bookings/route.ts` — POST, cron n8n (mesmo padrão `x-api-key`), cancela appointments com `payment_status='aguardando'` e `booking_expires_at < now`
- `src/app/(dashboard)/configuracoes/agendamento-publico/page.tsx` — tela de config: slug, notification_phone, slot_duration_minutes, buffer_minutes, procedure_types (CRUD), professional_hours (CRUD por profissional)

### Alterados
- `src/app/actions/appointment-payment.ts` — `markAppointmentPaidAction` passa a também setar `status='confirmed'`, limpar `booking_expires_at`, e disparar `sendWhatsAppText` de confirmação pro paciente
- `src/lib/evolution.ts` — nenhuma mudança de assinatura, só reuso de `sendWhatsAppText`/`sendWhatsAppImage` já existentes
- `src/lib/supabase/types.ts` — regenerar tipos após migration

## Fluxo de dados (submit do agendamento)

1. Client component chama `GET /api/public/booking/{slug}/availability?professionalId=X&from=&to=` → lista de slots livres
2. Paciente escolhe slot, preenche nome/telefone, `POST /api/public/booking/{slug}`
3. Endpoint (dentro de transação/lock lógico):
   a. Revalida que o slot ainda tá livre (reconsulta appointments do profissional no range ± buffer — proteção contra race condition de dois pacientes batendo no mesmo slot ao mesmo tempo)
   b. Upsert `clients` por (`tenant_id`, `phone`)
   c. Insert `appointments` (status=pending, payment_status=aguardando, deposit_amount=tenant.default_deposit_amount, booking_expires_at=now+hold, source=public_booking)
   d. Gera Pix (`generatePixQr`), manda QR (`sendWhatsAppImage`) + código copia-cola (`sendWhatsAppText`) pro paciente
   e. Manda texto pro `tenant.notification_phone` com nome/data/hora/profissional
4. Se `tenant.notification_phone` vazio, pula (e) sem erro — não bloqueia o fluxo principal
5. Se `tenant.pix_key` vazio, aborta com erro amigável ("clínica não configurou pagamento, tente novamente mais tarde") — não cria appointment órfão

## Tratamento de erro

- Slot ocupado entre a consulta de disponibilidade e o submit (race condition): retorna 409, frontend recarrega lista de slots
- Telefone inválido: validação client-side + server-side (formato BR)
- Falha no envio do WhatsApp (Evolution API fora do ar): appointment já foi criado (não desfaz), loga erro, mostra pro paciente "agendamento feito, mas não conseguimos confirmar por WhatsApp — anote o horário: X". Secretária ainda vê o pendente na agenda normalmente.
- Tenant sem `professional_hours` cadastrado pro profissional: lista de slots vazia + mensagem "esse profissional ainda não tem horários configurados"

## Automação / cron (n8n)

Dois endpoints novos chamados por n8n, mesmo padrão do `/api/automations/reminders` já existente (`x-api-key` header, roda a cada ~15min):
- `/api/automations/expire-bookings` — expira reservas não pagas
- (lembrete 24h/2h não muda — já pega qualquer appointment com status pending/confirmed automaticamente)

## Testes

- `src/lib/availability.ts`: unit tests puros — dado professional_hours + appointments existentes + buffer, retorna slots corretos (casos: sem conflito, conflito parcial, buffer empurra horário, slot no passado excluído, múltiplos dias)
- API `POST /api/public/booking/[slug]`: teste de integração — cria client+appointment, valida race condition (dois submits simultâneos pro mesmo slot, um deve falhar com 409)
- `markAppointmentPaidAction`: valida que seta status=confirmed e limpa booking_expires_at
- `expire-bookings`: valida que só cancela pending+aguardando expirados, não mexe em confirmados
