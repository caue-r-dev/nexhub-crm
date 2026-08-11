// Bate o telefone de quem mandou mensagem contra a base de clientes do
// tenant — cliente já cadastrado não deve receber o discurso de venda do
// bot de primeiro contato (fluxo pensado pra lead novo). Comparação por
// sufixo de dígitos porque `clients.phone` é texto livre, sem formato
// garantido (com/sem DDI, com/sem espaço, etc).
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone } from '@/lib/evolution'

export function phonesMatch(a: string, b: string): boolean {
  const normA = normalizePhone(a)
  const normB = normalizePhone(b)
  if (!normA || !normB) return false
  return normA.slice(-10) === normB.slice(-10)
}

export async function isExistingClient(tenantId: string, phone: string): Promise<boolean> {
  if (!normalizePhone(phone)) return false

  const admin = createAdminClient()
  const { data } = await admin.from('clients').select('phone').eq('tenant_id', tenantId).not('phone', 'is', null)
  if (!data) return false

  return data.some((c) => phonesMatch(phone, c.phone as string))
}
