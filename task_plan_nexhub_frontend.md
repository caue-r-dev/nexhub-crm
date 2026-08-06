# Task: Identidade visual + reestruturação do frontend — NexHub CRM

## Contexto

Nova identidade visual do NexHub foi fechada (ícone de rede hexagonal + wordmark, cor de marca índigo `#4338CA`). Esta task cobre (1) implementação dos assets de marca no sistema e (2) reestruturação do layout e páginas do dashboard, seguindo referência visual anexada (prints do concorrente Capim para estrutura de sidebar).

## Assets de marca

Os arquivos já estão prontos em:

```
C:\Users\cauer\Desktop\NexHub\nexhub-brand-package
```

Conteúdo da pasta:
- `nexhub-icon.png` — símbolo isolado (400x400, fundo transparente)
- `nexhub-wordmark.png` — ícone + texto "NexHub" compostos (fundo transparente)
- `favicons/favicon.ico` — multi-tamanho (16/32/48)
- `favicons/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`
- `favicons/apple-touch-icon-180x180.png`
- `favicons/icon-192x192.png`, `icon-512x512.png`

---

## 1. Favicon / aba do navegador (apenas o símbolo)

- Copiar de `favicons/` para `app/`:
  - `favicon.ico` → `app/favicon.ico`
  - `icon-192x192.png` → `app/icon.png`
  - `apple-touch-icon-180x180.png` → `app/apple-icon.png`
- Isso ativa a convenção automática de favicon do Next.js App Router, sem precisar mexer em `<head>` manualmente.
- Se existir `manifest.json` (PWA), atualizar as referências de ícone com os tamanhos 192x192 e 512x512.

## 2. Cor de marca no design system

- Registrar `#4338CA` como `brand.primary` (ou equivalente) no `tailwind.config.ts`, em `colors.brand.*` — mesmo padrão já usado no Orça Fácil.
- Essa cor passa a ser a cor de destaque padrão do sistema (botões primários, links ativos, item de menu ativo, etc.), a menos que sobrescrita pela cor personalizada do cliente (ver item 7).

## 3. Mudança global de layout — navegação horizontal → sidebar lateral esquerda

- Substituir a navbar horizontal atual (Início/Agenda/Clientes/Financeiro/Atendimento no topo) por uma **sidebar vertical fixa à esquerda**.
- Topo da sidebar: logo NexHub — `nexhub-icon.png` sozinho quando recolhida, `nexhub-wordmark.png` quando expandida.
- Itens de menu com ícone + label, navegando pras respectivas páginas (Início, Agenda, Clientes, Financeiro, Atendimento).
- **Botão de recolher/expandir**: recolhida mostra só ícones; expandida mostra ícone+texto. Persistir a preferência do usuário (localStorage ou campo no perfil).
- Cor de fundo da sidebar: índigo bem escuro (`#1E1B4B`), não cinza/preto genérico — mantém identidade de marca.
- Item ativo: destacado com `#4338CA` (fundo sutil ou barra lateral indicadora).
- Referência visual de estrutura: prints anexados do concorrente Capim (sidebar estreita, ícones, área de conteúdo clara à direita) — adaptar cores para a paleta do NexHub, não copiar a paleta roxa/verde deles.

## 4. Tela "Início" — transformar em dashboard-resumo do dia

Hoje a tela está vazia (placeholder sem conteúdo real). Substituir por:

- **Saudação no topo**: nome da clínica/empresa (como já aparece hoje, ex. "Clínica Teste NexHub"), mantendo esse elemento.
- **Cards de métricas** (grid de 3-4 cards, mesmo estilo visual dos cards que já existem na tela Financeiro):
  - Agendamentos de hoje (número total + horário do próximo)
  - Valor a receber hoje/nesta semana
  - Pendências financeiras (reaproveitar o dado que já existe no Financeiro)
  - Novos clientes na semana (incluir apenas se o dado já estiver disponível sem trabalho extra de schema)
- **Lista dos próximos agendamentos do dia**: 3-5 itens (nome do cliente, horário, profissional), com link rápido para a Agenda completa.
- Manter a tela enxuta — é visão geral, não deve duplicar Agenda ou Financeiro inteiros, só puxar os dados-chave de cada um.

## 5. Agenda

- Manter a estrutura atual (colunas por profissional, visão dia/semana) — já está funcionalmente ok.
- ⏳ **Pendente**: redesenho do card de agendamento — Cauê vai enviar um exemplo de referência visual em separado. Não alterar o card ainda nesta rodada, só sinalizar no código onde o componente do card está localizado para facilitar o ajuste posterior.

## 6. Clientes

- Melhorar o front mantendo a função atual (não alterar lógica/dados):
  - Cards com bordas suaves e cantos arredondados, consistentes com o resto do sistema
  - Tipografia consistente com o design system aplicado nas outras telas
  - Espaçamento mais generoso entre elementos
  - Ícones nos campos de contato (telefone, e-mail, etc.)

## 7. Financeiro

- Melhorar o gráfico de barras atual (mesma paleta de cores da marca).
- **Adicionar gráfico de linha/área mostrando evolução de desempenho ao longo do tempo**, estilo gráfico de mercado financeiro:
  - Usar `AreaChart` do Recharts (já está no stack do projeto)
  - Linha contínua com preenchimento de área sutil abaixo, gradiente na cor de marca (`#4338CA` esmaecendo para transparente)
  - Eixo X com os meses, eixo Y com valores
  - Tooltip ao passar o mouse mostrando o valor exato do período
  - Mostrar evolução de receita mês a mês (mesma fonte de dados do gráfico de barras existente, só numa segunda visualização complementar, não substituindo a primeira)

## 8. Atendimento

- ⏳ **Pendente**: Cauê vai enviar exemplo de referência de front em separado. Não alterar ainda, só aplicar os tokens de cor/tipografia globais que não dependem do layout específico (ex: cor dos balões de mensagem enviada podem já usar `#4338CA` em vez da cor atual, se for uma mudança de baixo risco).

## 9. Cor da agenda personalizada por cliente

- O calendário/agenda deve usar a **cor pré-cadastrada de cada empresa/cliente** nos blocos de agendamento e badges de profissional, em vez de cores fixas hardcoded no componente.
- Verificar se o campo `cor_primaria` (ou equivalente) já existe na tabela `empresas` — esse mesmo conceito já foi implementado no Orça Fácil para personalização de PDF, então pode já existir ou precisar ser replicado para o schema do NexHub.
- Se não existir, adicionar `cor_primaria` com valor padrão `#4338CA` (a cor de marca do NexHub) para clientes que ainda não personalizaram.

---

## Itens que ficam para depois (não travar esta rodada)

- Redesenho do card de agendamento (Agenda) — aguardando referência
- Redesenho completo do front de Atendimento — aguardando referência

## Validação

Como sempre: testar cada item manualmente no navegador antes de marcar como concluído. Não confiar em status "done" sem validação visual real, principalmente a troca de navbar → sidebar (isso afeta todas as páginas de uma vez, maior risco de quebrar algo).
