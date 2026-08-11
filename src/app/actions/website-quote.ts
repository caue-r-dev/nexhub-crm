'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentTenant } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/evolution'

// Número do NexHub — quem vende/orça o site fica sabendo na hora que um
// tenant clicou em "Site da clínica" e não tinha site configurado.
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
      `A clínica "${t.name}" clicou em "Site da clínica" e não tem site ainda — quer orçamento pra criar um.`
    )
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não foi possível enviar o aviso.' }
  }

  return { ok: true }
}

export async function saveWebsiteUrlAction(url: string) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (!url.trim()) return { error: 'Informe a URL do site.' }

  const admin = createAdminClient()
  const { error } = await admin.from('tenants').update({ website_url: url.trim() }).eq('id', tenant.id)
  if (error) return { error: error.message }

  revalidatePath('/agenda')
  revalidatePath('/configuracoes/clinica')
  return { ok: true }
}
