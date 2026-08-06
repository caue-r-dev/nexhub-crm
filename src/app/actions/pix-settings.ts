'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updatePixSettingsAction(input: { pixKey: string; pixReceiverName: string }) {
  if (!input.pixKey.trim()) return { error: 'Informe a chave Pix.' }
  if (!input.pixReceiverName.trim()) return { error: 'Informe o nome do recebedor.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({ pix_key: input.pixKey.trim(), pix_receiver_name: input.pixReceiverName.trim() })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes/pix')
}
