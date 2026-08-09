'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function updateClinicProfileAction(input: { phone: string; email: string; address: string }) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      address: input.address.trim() || null,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/clinica')
}
