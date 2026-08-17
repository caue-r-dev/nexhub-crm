-- Lançamento de despesa (insumos, aluguel, outros gastos) além do que já
-- existia (cobrança de cliente) — dono precisa do saldo líquido real
-- (recebido - gasto), não só quanto entrou.
alter table transactions add column type text not null default 'receita' check (type in ('receita', 'despesa'));
alter table transactions add column description text;
