// Marca "respondido" num recipient de campanha quando o telefone manda
// qualquer mensagem depois do envio — chamado pelo webhook do Chatwoot em
// toda mensagem incoming, não é gatilho de nenhum fluxo de resposta
// específico da campanha.
import { createAdminClient } from '@/lib/supabase/admin'

export async function markCampaignRecipientResponded(tenantId: string, phone: string): Promise<void> {
  const admin = createAdminClient()

  const { data: recipients } = await admin
    .from('campaign_recipients')
    .select('id, campaigns!inner(tenant_id)')
    .eq('phone', phone)
    .eq('status', 'sent')
    .is('responded_at', null)
    .eq('campaigns.tenant_id', tenantId)

  if (!recipients || recipients.length === 0) return

  await admin
    .from('campaign_recipients')
    .update({ responded_at: new Date().toISOString() })
    .in(
      'id',
      recipients.map((r) => r.id)
    )
}
