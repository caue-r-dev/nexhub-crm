# Task: Aumentar cards da Início — valores exatos (sem interpretação)

## Contexto crítico

As duas rodadas anteriores relataram "cards aumentados" mas a medição em pixel dos screenshots (antes e depois) mostra **104px de altura em ambas** — nenhuma mudança real foi aplicada, apesar dos relatórios de conclusão. Não confiar em avaliação subjetiva de "já está grande" — usar os valores abaixo literalmente.

## Especificação exata do card de métrica (tela Início)

Arquivo provável: componente de card usado na tela Início (`MetricCard` ou nome equivalente).

Trocar os valores atuais pelos seguintes:

- **Padding interno do card**: `24px` → `32px` (todas as direções)
- **Altura mínima do card**: adicionar `min-height: 140px` (hoje não há altura mínima definida, por isso o card "encolhe" pro conteúdo)
- **Tamanho do ícone circular**: `40px` → `56px` de diâmetro
- **Tamanho da fonte do número principal** (ex: "3", "R$ 0,00"): `24px` (`text-2xl`) → `36px` (`text-4xl`)
- **Tamanho da fonte do label** (ex: "Agendamentos hoje"): `14px` → `16px`
- **Gap entre os 4 cards no grid**: `16px` → `24px`

## Validação obrigatória

1. Depois de aplicar, rodar `npm run build` local e abrir no navegador.
2. Tirar screenshot da tela Início.
3. **Medir a altura do primeiro card em pixels na screenshot** (pode usar a ferramenta de inspeção do navegador, clicando no card e lendo a altura no painel de layout do DevTools).
4. Só reportar como concluído se a altura medida for **visivelmente maior que 104px** (esperado: por volta de 140-160px com os valores acima). Se a medição não mudou, o CSS não foi aplicado ou está sendo sobrescrito por outra regra — investigar antes de reportar.

## Fora de escopo nessa rodada

- Faixa azul: resolvida (não é bug do app, provavelmente artefato de captura de tela do sistema operacional). Não investigar mais.
- Botão de logout: já implementado e funcionando, confirmado.
