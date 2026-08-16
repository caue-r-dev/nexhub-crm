-- Rastreia desde quando o tenant está preso em "connecting" (instância nova
-- que nunca terminou de parear, ou sessão existente que travou nesse
-- estado) — usado pelo whatsapp-health pra distinguir "esperando o usuário
-- escanear o QR" (normal, recente) de "socket fantasma na fase de
-- pareamento" (travado por muito tempo, precisa de restart automático).
alter table tenants add column connecting_since timestamptz;
