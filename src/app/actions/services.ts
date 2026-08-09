'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createServiceAction(name: string, defaultValue: number) {
  if (!name.trim()) return { error: 'Informe um nome.' }
  if (defaultValue < 0) return { error: 'Valor não pode ser negativo.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .insert({ tenant_id: tenant.id, name: name.trim(), default_value: defaultValue })
    .select('id, name, default_value, active')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/servicos')
  return { data }
}

export async function toggleServiceAction(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('services').update({ active }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/servicos')
}
