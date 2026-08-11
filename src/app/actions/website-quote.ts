'use server'

import { getCurrentTenant } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

// Número do NexHub — quem vende/orça o site fica sabendo na hora que um
// tenant clicou em "Site da clínica" sem ter site configurado ainda.
const ADMIN_PHONE = '15981504416'

export async function requestWebsiteQuoteAction() {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const admin = createAdminClient()
  const { data: t } = await admin
    .from('tenants')
    .select('name, evolution_base_url, evolution_api_key, evolution_instance_name')
    .eq('id', tenant.id)
    .single()

  if (!t?.evolution_base_url || !t.evolution_api_key || !t.evolution_instance_name) {
    return { error: 'WhatsApp da clínica não está conectado — não deu pra avisar automaticamente. Entre em contato direto.' }
  }

  try {
    await sendWhatsAppText(
      { baseUrl: t.evolution_base_url, apiKey: t.evolution_api_key, instanceName: t.evolution_instance_name },
      ADMIN_PHONE,
      `A clínica "${t.name}" clicou em "Site da clínica" e ainda não tem site configurado — quer orçamento pra criar um.`
    )
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não foi possível enviar o aviso.' }
  }

  return { ok: true }
}
