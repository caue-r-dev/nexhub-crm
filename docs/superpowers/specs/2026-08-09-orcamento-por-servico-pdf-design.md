# Orçamento por serviço + PDF (com odontograma) — Design

Data: 2026-08-09
Status: aprovado, pronto pra plano de implementação

## Objetivo

Deixar de digitar cada item do orçamento do zero — cadastrar um catálogo de serviços/tratamentos reutilizável (nome + valor padrão) e gerar um PDF profissional do orçamento (3 variações), inspirado na estrutura do Codental (referência visual analisada em `app.codental.com.br`).

## Escopo

- Catálogo de serviços por tenant (nome + valor padrão + ativo/inativo), com criação inline durante a montagem do orçamento (igual ao Codental: autocomplete + "Cadastrar novo")
- Formulário de orçamento passa a buscar serviço no catálogo em vez de digitar descrição+valor toda vez — item ainda guarda descrição/valor congelados no momento da adição (orçamento não muda retroativamente se o preço do catálogo mudar depois)
- Geração de PDF em 3 variações (página HTML de impressão, sem biblioteca nova — usuário usa "Salvar como PDF" do navegador):
  1. **Somente valor total** — paciente + valor total, sem itens
  2. **Padrão** — lista de procedimentos + total, sem odontograma
  3. **Completo** — lista de procedimentos + odontograma do paciente + total
- Dados de cabeçalho/rodapé do documento: nome/telefone/email/endereço da clínica (campos novos em `tenants`) + nome do profissional + registro profissional (CRO, campo novo em `professionals`)

## Fora de escopo (não-goals desta v1)

- PDF real gerado no servidor (biblioteca tipo `@react-pdf/renderer`) — fica pra depois se o "salvar como PDF" do navegador não for suficiente
- Link público do orçamento pro paciente acessar sozinho (impressão é iniciada pela clínica, de dentro do painel — mesmo padrão do Codental)
- Odontograma clicável/editável dentro do PDF (é só uma renderização estática do estado atual, não interativo)
- Editar item de orçamento já criado pra trocar de serviço do catálogo (segue como hoje: exclui e adiciona de novo)

## Schema (novo)

### `services` — tabela nova
```
id uuid pk
tenant_id uuid fk -> tenants
name text not null
default_value numeric(10,2) not null default 0
active boolean not null default true
created_at timestamptz
```
RLS: mesmo padrão de isolamento por `tenant_id` já usado em `procedure_types`/`professionals`.

### `tenants` — novas colunas
- `phone text` — telefone público exibido no PDF (distinto de `notification_phone`, que é interno pra avisos de agendamento)
- `email text`
- `address text`

### `professionals` — nova coluna
- `registration_number text` — CRO/CRM/registro profissional, exibido na assinatura do PDF

### `BudgetItem` (tipo TS, campo jsonb existente em `treatment_budgets.items` — sem migration, só tipo)
Adiciona campo opcional `service_id?: string` — rastreio de qual serviço do catálogo originou o item (não obrigatório: item pode ser digitado livre, como hoje, sem vir do catálogo).

## Componentes / arquivos

### Novos
- `src/app/actions/services.ts` — `createServiceAction`, `toggleServiceAction` (mesmo padrão de `procedure-types.ts`)
- `src/components/configuracoes/ServicesForm.tsx` + `src/app/(dashboard)/configuracoes/servicos/page.tsx` — tela de catálogo (lista + adicionar + ativar/desativar)
- `src/components/orcamentos/ServiceAutocomplete.tsx` — combobox de busca no catálogo, com opção "Cadastrar novo serviço {termo}" inline quando não encontra
- `src/app/(print)/clientes/[id]/orcamentos/[budgetId]/imprimir/[variante]/page.tsx` + `src/app/(print)/layout.tsx` — novo route group `(print)` (não afeta a URL, só o layout): layout próprio, sem sidebar/nav do dashboard, com o mesmo check de sessão que as páginas do `(dashboard)` já fazem (`getCurrentTenant()` null → redirect pro login), já que fica fora do layout que hoje faz essa checagem. Conteúdo: só o documento + botão flutuante "Imprimir" que chama `window.print()`. `variante` é `total | padrao | completo`. URL final: `/clientes/{id}/orcamentos/{budgetId}/imprimir/{variante}` — mesmo prefixo de URL do `(dashboard)/clientes/...`, mas árvore de arquivos e layout completamente separados (route groups do Next.js não colidem por isso).
- `src/components/orcamentos/PrintButton.tsx` — client component, botão que chama `window.print()`, escondido via `print:hidden`
- `src/components/orcamentos/BudgetPrintDocument.tsx` — componente de apresentação do documento (cabeçalho da clínica, título, tabela de itens condicional, odontograma condicional, rodapé assinatura), reusado pelas 3 variantes via prop `variant`
- `src/app/actions/tenant-profile.ts` (ou extensão de arquivo de config existente) — action pra editar telefone/email/endereço da clínica
- `src/app/actions/professionals.ts` — estende `updateProfessionalAction` com `registrationNumber`

### Alterados
- `src/components/orcamentos/TreatmentBudgetForm.tsx` — troca campo de descrição livre por `ServiceAutocomplete`; ao selecionar um serviço, pré-preenche descrição+valor (ainda editáveis antes de adicionar, igual ao Codental)
- `src/app/(dashboard)/clientes/[id]/orcamentos/page.tsx` — cada orçamento ganha um menu "Imprimir" com as 3 variantes (link pras páginas novas), mesmo padrão do menu "..." do Codental
- `src/app/(dashboard)/agenda/profissionais/[id]/editar/page.tsx` — adiciona campo de registro profissional no form existente
- `src/lib/supabase/types.ts` — novos campos/tabela

## Fluxo de dados (impressão)

1. Secretária/dentista clica "Imprimir" numa das 3 variantes na tela de orçamentos
2. Navega pra `/clientes/{id}/orcamentos/{budgetId}/imprimir/{variante}` (server component, sessão autenticada — mesmo controle de acesso das outras telas internas, não é rota pública)
3. Página busca: orçamento (`treatment_budgets`), cliente, tenant (nome/telefone/email/endereço), profissional (nome/registro) — e se `variante === 'completo'`, também os registros do odontograma (`odontogram_records`)
4. Renderiza `BudgetPrintDocument` com layout limpo (sem sidebar/nav do dashboard) e CSS de impressão (`@media print` esconde o botão, ajusta margens)
5. Usuário clica "Imprimir" → `window.print()` → dialog nativo do navegador → escolhe "Salvar como PDF" ou impressora física

## Tratamento de erro

- Orçamento/cliente não encontrado → `notFound()` (mesmo padrão das outras páginas de cliente)
- Tenant sem telefone/email/endereço cadastrado → campo simplesmente não aparece no cabeçalho (não quebra o documento)
- Profissional sem registro cadastrado → assinatura mostra só o nome, sem "CRO ..."
- Variante inválida na URL → `notFound()`

## Testes

- Sem testes automatizados pras páginas de impressão (páginas de servidor renderizando HTML estático, mesmo padrão de escopo já estabelecido nas features anteriores — sem harness de teste de UI neste projeto)
- `services.ts` actions: sem teste unitário dedicado, mesmo padrão de `procedure-types.ts`
