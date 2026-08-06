# Kickoff — Agenda Google Calendar + Profissionais + Gráficos + Pacotes/Sessões + Pix

## Contexto
Redesign da Agenda do NexHub CRM já validado visualmente via protótipo React
(`agenda-prototype.jsx`, anexo). Esta task implementa em produção (Next.js +
Supabase) o que foi desenhado, mais quatro funcionalidades adicionais
definidas nesta sessão de planejamento.

Regras gerais do projeto que continuam valendo: schema aditivo sempre (nunca
alterar/remover coluna existente sem necessidade), sem over-engineering (só
implementar o que está listado abaixo), parar nos checkpoints pra validação
manual do Cauê antes de seguir.

---

## A1. Agenda estilo Google Calendar (multi-profissional)

- **Visão Dia**: colunas lado a lado, uma por profissional visível. Grade de
  horário em intervalos de 30 min. Blocos de agendamento posicionados por
  horário de início e altura proporcional à duração.
- **Visão Semana**: colunas = dias da semana. Como profissional × dia em uma
  grade só ficaria poluído, a visão Semana mostra **um profissional por vez**,
  selecionado via dropdown no topo.
- **Filtro de profissionais**: chips no topo da tela (Dia e Semana), permite
  mostrar/ocultar profissionais na grade. Cada profissional tem uma cor de
  identificação própria (diferente da cor de marca do tenant e das cores de
  status).
- **Cores de status continuam fixas**, independente da paleta do tenant:
  pendente = azul, confirmado = verde, cancelado = vermelho.
- Cada bloco de agendamento mostra: horário, nome do cliente, tipo de
  serviço/procedimento, cor de status na borda esquerda.
- Referência de layout: `agenda-prototype.jsx`.

## A2. Responsividade

- **Tablet landscape** é a referência principal de uso real (cliente usa
  majoritariamente assim).
- **Tablet portrait**: suportado — colunas de profissional podem precisar de
  scroll horizontal.
- **Mobile**: suportado — view compacta, chips de profissional com scroll
  horizontal, grade com scroll horizontal se necessário.
- Testar minimamente em: iPad landscape, iPad portrait, um smartphone comum.

## A3. "+Adicionar profissional" funcional

- Nova tabela `professionals`: `id`, `tenant_id` (FK), `name`, `color`
  (hex, cor de identificação na agenda), `active` (bool, default true),
  `created_at`.
- `appointments.professional_id` — nova coluna FK pra `professionals`,
  **nullable** (migração aditiva; agendamentos existentes ficam sem
  profissional atribuído até serem editados manualmente — não inventar
  profissional default fictício).
- Tela de cadastro/edição de profissional: nome + seletor de cor (paleta
  simples pré-definida de 6-8 cores, não precisa color picker livre).
- Campo de seleção de profissional no formulário de criar/editar
  agendamento.
- RLS: `professionals` segue o mesmo padrão de isolamento por `tenant_id`
  já usado nas outras tabelas.

## A4. Gráficos no Financeiro

- Gráfico de receita ao longo do tempo (linha, últimos 30/90 dias,
  toggle entre os dois períodos).
- Visão recebido vs. a receber vs. pendente (barra ou pizza — decidir o que
  fica mais claro na implementação).
- Usar Recharts.
- Os cards numéricos que já existem no financeiro **permanecem** — os
  gráficos são adição, não substituição.

## A5. Controle de pacotes e sessões

Relevante especialmente pro nicho de estética/salão (pacote de N sessões),
mas implementado como feature genérica do núcleo (não amarrada a um nicho
específico).

- Nova tabela `packages`: `id`, `tenant_id`, `client_id`, `service_name`,
  `total_sessions`, `used_sessions` (default 0), `price`, `purchased_at`,
  `expires_at` (nullable).
- Ao marcar um agendamento vinculado a um pacote como concluído,
  incrementar `used_sessions` em 1.
- Tela simples de listagem de pacotes dentro da ficha do cliente (nome do
  serviço, sessões usadas/total, validade se houver).
- Escopo mínimo proposital: **sem** renovação automática, **sem** cobrança
  recorrente do pacote — só controle manual de saldo de sessões nesta
  rodada.

## A6. Pix antecipado no agendamento (sem gateway)

Mesmo princípio já usado no fechamento da Poliform: QR Code Pix estático
gerado a partir da chave Pix + valor, **sem gateway/PSP, sem webhook, sem
onboarding financeiro por tenant**. Cada tenant cadastra a própria chave
Pix; o dinheiro cai direto na conta dele, nunca passa pelo NexHub.

- `tenants` — nova coluna `pix_key` (nullable, aditiva) e `pix_receiver_name`
  (nome do recebedor exigido pelo payload do BR Code — pode ser o nome do
  tenant já cadastrado, confirmar se precisa de campo próprio ou reaproveita
  o existente).
- Geração do payload BR Code (padrão Bacen) + QR: usar uma lib pronta
  (ex.: `qrcode` pra renderizar a imagem + uma lib de payload Pix tipo
  `pix-utils` ou `qrcode-pix` no npm — Claude Code escolhe a mais madura/
  mantida na hora de implementar).
- **Mostrar os dois formatos juntos na tela de agendamento**: a imagem do
  QR Code E o código "Pix Copia e Cola" (a string do BR Code em texto,
  com botão de copiar) — nem todo cliente consegue escanear QR direto do
  WhatsApp/print, o texto copiável é o fallback necessário.
- `appointments` — nova coluna `payment_status` (enum ou texto:
  `nao_solicitado` / `aguardando` / `confirmado`, default
  `nao_solicitado`, aditiva).
- Sem confirmação automática: um botão manual "Marcar como pago" no
  agendamento muda `payment_status` pra `confirmado` — o mesmo modelo
  operacional já usado na Poliform (alguém confere o extrato e confirma
  na mão).
- Campo de valor do sinal: pode ser fixo por serviço ou digitado na hora
  de gerar o QR — decisão de UX a definir na implementação, não travar
  por isso.
- Fora de escopo aqui: geração automática de QR dinâmico, split de
  pagamento, qualquer integração com gateway. Fica pra uma fase futura
  **se e quando** fizer sentido ter confirmação automática via webhook.

---

## Fora de escopo nesta rodada

- Odontograma / anamnese digital personalizável — específico de nicho,
  entra quando cada nicho for desenhado em detalhe.
- App nativo Android/iOS — decisão já tomada: seguir só PWA por
  orçamento.
- Migração automatizada de sistema concorrente — decisão comercial, não
  técnica.
- Módulo do salão de unhas (Fase 4) — ainda sem desenho, feature de
  pacotes/sessões acima já prepara terreno pra quando for desenhado.

## Checkpoints de validação (parar e aguardar Cauê)

1. Migração SQL aplicada — confirmar no Supabase que `professionals` e
   `packages` existem, RLS ativo, nenhuma tabela existente foi alterada
   de forma destrutiva.
2. Agenda funcionando com dado real (não mock) — comparar visualmente com
   o protótipo aprovado, testar em tablet landscape.
3. "+Adicionar profissional" funcional — cadastrar profissional de teste,
   vincular a um agendamento real, confirmar que aparece na coluna certa.
4. Gráficos no financeiro renderizando com dado real.
5. Pacotes/sessões — fluxo completo: criar pacote → agendar sessão vinculada
   → marcar como concluída → confirmar que o saldo decrementa.
6. Pix antecipado — cadastrar chave Pix de teste no tenant, gerar QR num
   agendamento, escanear com app de banco de verdade pra confirmar que o
   payload está correto (valor e recebedor certos), testar também o botão
   de copiar o código Copia e Cola, testar o botão manual de marcar como
   pago.

Atualizar `progress.md` a cada etapa concluída. Não implementar a próxima
etapa sem o checkpoint anterior validado manualmente.
