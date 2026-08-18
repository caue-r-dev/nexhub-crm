-- ============================================================
-- FASE: agendamento público — redesign visual (foto, sobre,
-- registro já existentes; preço de serviço; mapa real do endereço)
-- Aplicar manualmente via Supabase Dashboard > SQL Editor
-- ============================================================

-- PROFESSIONALS: foto e texto "sobre" exibidos no link público
alter table professionals add column photo_url text;
alter table professionals add column bio text;

-- PROCEDURE_TYPES: preço exibido no link público — texto livre pra
-- suportar "R$ 150", "A partir de R$ 480" ou vazio (sem preço fixo),
-- cada tenant tem sua própria tabela de procedimentos já isolada por RLS.
alter table procedure_types add column price_label text;

-- TENANTS: coordenadas geocodadas automaticamente a partir do endereço
-- cadastrado, pro mapa embutido no link público usar localização real.
alter table tenants add column latitude double precision;
alter table tenants add column longitude double precision;
