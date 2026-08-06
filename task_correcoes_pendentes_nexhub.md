# Task: Correções não aplicadas + item novo (botão sair)

## Contexto

Validação manual do print revelou que a rodada anterior só resolveu parcialmente o que foi pedido. Reportar isso explicitamente: **valide de verdade essa vez, com screenshot comparando antes/depois, antes de marcar como concluído.**

---

## 1. Ainda existe um elemento azul hardcoded fora da sidebar

A sidebar em si já está correta (item ativo em terracota, confirmado). Mas existe uma **faixa azul-marinho na parte inferior da tela**, atravessando toda a largura (visível no rodapé do viewport, cor aproximada `#132458` — diferente do índigo de marca `#4338CA` e diferente do fundo da sidebar `#1E1B4B`).

**Ação**:
- Localizar esse elemento no código (buscar por cores hex próximas de `#132458`, `#1a1f5c`, ou qualquer `border-bottom`/`background` fixo em azul/índigo fora do componente de sidebar).
- Provavelmente é um resquício de estilo do scaffold inicial (borda de container, footer não removido, etc.) — se não tiver função visual clara, remover. Se tiver função (ex: footer de status), aplicar `var(--accent)` do tenant como foi feito no resto, ou usar uma cor neutra do design system em vez de azul fixo.

## 2. Densidade de layout — ainda não foi aplicada

O print da tela Início mostra os cards de métrica no **mesmo tamanho de antes** da correção, com a mesma quantidade de espaço em branco embaixo. O ajuste pedido na rodada anterior (cards maiores, mais padding, tipografia maior, melhor preenchimento) não teve efeito visível.

**Ação**:
- Revisitar o componente de card da tela Início: aumentar padding interno, tamanho da fonte do número principal (hoje pequeno demais pro peso visual que a tela precisa), e tamanho do ícone.
- Se o grid de 4 cards continuar deixando muito espaço vazio abaixo mesmo depois de aumentar os cards individualmente, considerar aumentar o gap entre eles e/ou o padding geral do container de conteúdo, não só o tamanho interno de cada card isoladamente.
- **Validar com screenshot real antes de marcar como concluído** — comparar o print anterior com o novo lado a lado e confirmar visualmente que os cards realmente cresceram, não só que o código foi alterado.
- Aplicar o mesmo cuidado nas telas Clientes, Financeiro e Atendimento (a task anterior pediu isso mas não foi confirmado com prints individuais de cada uma).

## 3. Novo: botão de sair (logout)

Não existe hoje nenhuma forma de sair da conta.

**Ação**:
- Adicionar um botão/ícone de logout na sidebar, posicionado embaixo (rodapé da sidebar, próximo ou abaixo do avatar/inicial do usuário que já aparece lá — o círculo preto com "N" no canto inferior).
- Ação do botão: encerrar a sessão (Supabase Auth sign out) e redirecionar pra tela de login.
- Ícone sugerido: ícone de "sair"/porta com seta (lucide-react `LogOut`), consistente com os outros ícones já usados na sidebar.

---

## Validação obrigatória antes de reportar concluído

Para cada item acima, anexar um screenshot atual (pós-correção) e apontar especificamente onde a mudança está visível — não apenas descrever o que foi alterado no código.
