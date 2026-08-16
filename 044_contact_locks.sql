-- Lock de processamento por contato: serializa mensagens do mesmo
-- contato (evita a race condition onde duas mensagens quase simultâneas
-- rodam a IA em paralelo e a que perde a corrida de gravação em
-- conversation_state é descartada em silêncio, sem retry). Chave
-- primária composta = claim atômico via insert (constraint única).
-- Contatos diferentes nunca competem entre si.
create table contact_locks (
  tenant_id uuid references tenants(id) not null,
  contact_phone text not null,
  locked_at timestamptz not null default now(),
  primary key (tenant_id, contact_phone)
);
