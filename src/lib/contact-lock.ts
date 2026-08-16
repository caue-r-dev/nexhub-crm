// Lock de processamento por contato: serializa mensagens do mesmo
// contato (tenant_id + phone) sem serializar contatos diferentes entre
// si. Usa uma tabela de claim (constraint única em vez de
// pg_advisory_lock) porque o acesso ao banco aqui é via PostgREST
// (@supabase/supabase-js) — cada chamada é sua própria transação
// isolada, um lock consultivo do Postgres morreria antes do
// processamento (chamada ao Gemini, envio WhatsApp) terminar.
import { createAdminClient } from '@/lib/supabase/admin'

const STALE_LOCK_MS = 20_000
const WAIT_BUDGET_MS = 9_000
const POLL_INTERVAL_MS = 300

// Lock mais velho que isso é considerado de uma invocação que crashou
// sem liberar — nunca depende de a IA "lembrar" de liberar.
export function isLockStale(lockedAt: string, now: Date, staleMs: number = STALE_LOCK_MS): boolean {
  return now.getTime() - new Date(lockedAt).getTime() > staleMs
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tryClaim(tenantId: string, phone: string): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin.from('contact_locks').insert({ tenant_id: tenantId, contact_phone: phone })
  return !error
}

async function clearIfStale(tenantId: string, phone: string): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('contact_locks')
    .select('locked_at')
    .eq('tenant_id', tenantId)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (data && isLockStale(data.locked_at, new Date())) {
    // Apaga só se ninguém trocou o lock nesse meio-tempo (locked_at igual
    // ao que acabou de ler) — evita apagar um claim novo por engano.
    await admin
      .from('contact_locks')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('contact_phone', phone)
      .eq('locked_at', data.locked_at)
  }
}

// Tenta pegar o lock; se outro processo do mesmo contato já tá segurando,
// espera até WAIT_BUDGET_MS liberando (limpando lock morto no caminho).
// Retorna false só quando estourou o orçamento de espera — quem chamar
// deve mandar o fallback de ausência direto nesse caso, sem IA.
export async function acquireContactLock(tenantId: string, phone: string): Promise<boolean> {
  const deadline = Date.now() + WAIT_BUDGET_MS
  while (Date.now() < deadline) {
    if (await tryClaim(tenantId, phone)) return true
    await clearIfStale(tenantId, phone)
    await sleep(POLL_INTERVAL_MS)
  }
  return tryClaim(tenantId, phone)
}

export async function releaseContactLock(tenantId: string, phone: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('contact_locks').delete().eq('tenant_id', tenantId).eq('contact_phone', phone)
}
