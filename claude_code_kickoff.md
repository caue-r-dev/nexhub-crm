# Kickoff — NexHub CRM, Fase 1

Leia `task_plan.md` (nesta mesma pasta) antes de começar — ele contém a visão completa,
arquitetura multi-tenant e as 3 paletas de cor disponíveis.

## O que fazer nesta fase

1. Scaffold de projeto Next.js + Supabase + Tailwind, seguindo o mesmo padrão usado no Orça Fácil
2. Conectar ao projeto Supabase já criado (peça a URL e a anon key ao usuário se não estiverem
   nas variáveis de ambiente)
3. A migration SQL (`001_fase1_fundacao_multitenant.sql`) já foi aplicada manualmente pelo
   usuário via Supabase Dashboard — não a reaplique, apenas gere os types TypeScript a partir do
   schema existente
4. Construir o fluxo de cadastro (`/cadastro` ou `/onboarding`):
   - Step 1: dados básicos (nome do negócio, email, senha)
   - Step 2: seleção de nicho (dentista / unhas / advogado / outro) — cards visuais, não dropdown
   - Step 3: seleção de paleta (petroleo / bege / neutro) — mostrar preview visual real de cada
     uma, não só um quadrado de cor (reaproveitar a lógica do artifact React já validado com o
     usuário)
   - Ao concluir: cria registro em `tenants`, cria o primeiro `users` vinculado ao `auth.users`
5. Layout raiz da aplicação: ler `tenants.theme_palette` do tenant logado e aplicar os tokens de
   cor via CSS variables (ver mapeamento exato das 3 paletas em `task_plan.md`, seção Estilo)
6. Núcleo comum (ainda sem módulo de nicho):
   - Agenda: view semana/dia, criar/editar agendamento, cores de status fixas (pendente=azul,
     confirmado=verde, cancelado=vermelho — sempre essas cores, independente da paleta escolhida)
   - Clientes: lista com busca (nome/telefone/documento), cadastro, ficha básica
   - Financeiro: painel simples (recebido / a receber / pendências)

## Fora de escopo nesta fase (não implementar ainda)
- Módulo específico de nicho (odontograma, anamnese, etc.) — fase 2
- Integração com Chatwoot/Evolution API — fase 3
- Qualquer emissão de boleto, sistema de créditos, multi-clínica por conta, ou gerenciador de
  tarefas genérico — decisão explícita de não replicar essas features do sistema de referência

## Checkpoints de revisão
Pare e aguarde validação do usuário após:
- Fluxo de cadastro completo (antes de prosseguir pro núcleo)
- Núcleo funcional básico (antes de considerar a Fase 1 encerrada)

Atualize `progress.md` a cada etapa concluída.
