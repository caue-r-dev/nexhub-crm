-- Toggle pra desligar o bot de primeiro contato por tenant (clínica que só
-- usa agendamento manual, não quer o fluxo automático de venda via WhatsApp)
-- + campo de observações livres que a IA usa como contexto extra pra
-- responder perguntas fora do roteiro fixo (ex: convênios aceitos).
alter table tenants add column bot_enabled boolean not null default true;
alter table tenants add column bot_context_notes text;
