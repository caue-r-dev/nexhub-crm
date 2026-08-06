# Task: Corrigir cor de fundo da sidebar — deve ser 100% a cor do tenant, não só o item ativo

## Correção de especificação (erro meu na task original)

A task anterior pediu fundo fixo `#1E1B4B` (índigo escuro) pra sidebar inteira, com `var(--accent)` do tenant só no destaque do item ativo. Isso estava errado. O comportamento correto é:

**A sidebar inteira deve usar a cor da paleta do tenant como fundo**, não só um detalhe no item ativo.

## Especificação correta

- **Fundo da sidebar completa** = `var(--accent)` (ou a variável correspondente à cor primária da paleta do tenant) — não mais um índigo fixo.
  - Tenant com paleta terracota → sidebar inteira terracota
  - Tenant com paleta azul-petróleo → sidebar inteira azul-petróleo
  - Tenant com a terceira paleta (neutro/bege) → sidebar inteira nessa cor
- **Ícones e texto da sidebar** = branco por padrão.
  - ⚠️ Exceção a validar: se a paleta "neutro/bege" for uma cor clara (não escura), branco vai ficar ilegível em cima dela. Nesse caso específico, usar um texto escuro (ex: `#1a1a1a` ou a cor de texto padrão do design system) em vez de forçar branco. Se as 3 paletas já tiverem uma variável de "cor de texto sobre o accent" definida (contraste calculado), usar essa. Se não tiver, criar essa lógica simples: calcular se o accent é claro ou escuro e escolher branco ou texto escuro automaticamente — não deixar hardcoded.
- **Item ativo do menu**: pode manter um destaque sutil (ex: fundo levemente mais claro/escuro que o resto da sidebar, ou um indicador lateral) pra diferenciar do resto — mas isso é um detalhe dentro da cor do tenant, não uma cor diferente.
- **Fallback**: só usar o índigo de marca do NexHub (`#4338CA`) como cor de fundo da sidebar em tenants que ainda não escolheram nenhuma paleta (estado padrão/novo cadastro).

## Validação obrigatória

- Testar com o tenant "Clínica Teste NexHub" (paleta terracota) — sidebar inteira deve ficar terracota, com ícones brancos legíveis.
- Se possível, testar também com um tenant de paleta diferente (azul-petróleo ou neutro) pra confirmar que não ficou hardcoded pra terracota especificamente.
- Screenshot obrigatório mostrando a sidebar com fundo colorido (não mais índigo/azul-marinho) antes de reportar concluído.
