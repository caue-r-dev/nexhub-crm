'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type ClientInput = {
  name: string
  phone?: string
  document?: string
  birthDate?: string
  convenio?: string
}

// Sem redirect — usado pelo form de cadastro completo (que redireciona por fora)
// e pelo cadastro inline dentro do modal de agendamento (que só precisa do id criado).
async function insertClient(input: ClientInput) {
  if (!input.name.trim()) {
    return { error: 'Nome é obrigatório.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      phone: input.phone || null,
      document: input.document || null,
      birth_date: input.birthDate || null,
      convenio: input.convenio || null,
    })
    .select()
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Não foi possível criar o cliente.' }
  }

  return { client: data }
}

export async function createClientQuickAction(input: ClientInput) {
  const result = await insertClient(input)
  if ('error' in result) return result
  revalidatePath('/clientes')
  return result
}

export async function createClientAction(input: ClientInput) {
  const result = await insertClient(input)
  if ('error' in result) return result

  revalidatePath('/clientes')
  redirect(`/clientes/${result.client.id}`)
}

export async function updateClientAction(id: string, input: ClientInput) {
  if (!input.name.trim()) {
    return { error: 'Nome é obrigatório.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({
      name: input.name.trim(),
      phone: input.phone || null,
      document: input.document || null,
      birth_date: input.birthDate || null,
      convenio: input.convenio || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
  redirect(`/clientes/${id}`)
}
