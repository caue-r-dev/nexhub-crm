'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type PackageInput = {
  clientId: string
  serviceName: string
  totalSessions: number
  price?: number
  expiresAt?: string
}

export async function createPackageAction(input: PackageInput) {
  if (!input.serviceName.trim()) {
    return { error: 'Informe o nome do serviço.' }
  }
  if (!input.totalSessions || input.totalSessions < 1) {
    return { error: 'Informe a quantidade de sessões.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('packages').insert({
    tenant_id: tenant.id,
    client_id: input.clientId,
    service_name: input.serviceName.trim(),
    total_sessions: input.totalSessions,
    price: input.price || null,
    expires_at: input.expiresAt || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/clientes/${input.clientId}`)
  redirect(`/clientes/${input.clientId}`)
}
