# Task: Correções visuais pós-implementação — sidebar e densidade de layout

## Contexto

Testando com o tenant "Clínica Teste NexHub", que já tem a paleta terracota pré-cadastrada (visível corretamente nos botões e blocos da Agenda). Dois problemas visuais identificados nos prints.

---

## 1. Bug: cor da sidebar não está lendo a paleta do tenant

**O que está acontecendo**: o item ativo do menu lateral aparece azul-índigo (a cor de marca padrão do NexHub, `#4338CA`), mas essa clínica já tem a paleta terracota cadastrada — e essa cor terracota já aparece corretamente no botão "Novo agendamento", no toggle "Dia/Semana" e nos blocos de agendamento da tela Agenda.

**Causa provável**: a sidebar está usando a cor de marca do NexHub hardcoded (ou uma variável CSS diferente) em vez do mesmo `var(--accent)` (ou equivalente) que a tela de Agenda já está lendo corretamente da paleta do tenant.

**Correção**: aplicar a mesma fonte de cor que a Agenda já usa (`var(--accent)` do tenant) no:
- Indicador/fundo do item de menu ativo na sidebar
- Qualquer outro lugar do sistema que hoje esteja usando `#4338CA` fixo no lugar da cor do tenant

**Importante**: `#4338CA` (índigo, marca do NexHub) deve continuar sendo o **valor padrão/fallback** apenas para tenants que ainda não escolheram uma paleta — não deve ser removido do sistema, só parar de sobrescrever a escolha de quem já personalizou.

---

## 2. Layout com aparência "pobre" — muito espaço em branco, elementos pequenos/flutuando

Válido para: Início, Agenda, Clientes, Financeiro, Atendimento (todas as telas).

**Sintomas nos prints**:
- Tela Início: os 4 cards de métrica são pequenos e ficam "flutuando" no canto superior esquerdo, com uma área enorme vazia embaixo e à direita.
- Tela Agenda: as colunas de profissionais (Dra. Ana Teste / dr teste / Sem profissional) ocupam só uma fração da largura da tela, sobrando um espaço em branco grande à direita sem função.

**Direção da correção**:
- Os cards de métrica da Início devem ser maiores (mais padding interno, ícone e número com mais destaque) e a grid deve se adaptar pra ocupar melhor a largura disponível — não precisa inventar conteúdo novo pra preencher, mas os elementos existentes precisam ter presença visual maior.
- Na Agenda, avaliar a melhor solução para o espaço vazio à direita das colunas de profissionais — duas opções razoáveis, escolher a que for mais simples de implementar sem tocar na lógica de agendamento:
  - (a) as colunas de profissionais se expandem proporcionalmente para preencher a largura total disponível quando há poucos profissionais cadastrados, ou
  - (b) um painel lateral direito fixo com informações complementares do dia (ex: resumo/pendências), similar ao que list a Início.
- Mesmo princípio de "preencher melhor, elementos com mais presença" deve ser aplicado em Clientes, Financeiro e Atendimento — ajustar caso a caso conforme o conteúdo de cada tela, sem forçar todas a seguirem o mesmo grid se não fizer sentido pro conteúdo.
- Não é pra aumentar as margens/padding da página em si — é pra fazer o conteúdo interno (cards, colunas, listas) ocupar melhor o espaço que já existe, evitando a sensação de tela vazia/incompleta.

---

## Validação

Testar com pelo menos 2 tenants diferentes (um com paleta terracota, outro com uma paleta diferente das 3 disponíveis) pra confirmar que a cor da sidebar realmente segue o cadastro de cada um, e não ficou fixa em outra cor por engano.
