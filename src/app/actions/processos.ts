'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type ProcessoInput = {
  clientId: string
  numeroCnj?: string
  varaComarca?: string
  tipoAcao?: string
  areaDireito?: string
}

export async function createProcessoAction(input: ProcessoInput) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('processos')
    .insert({
      tenant_id: tenant.id,
      client_id: input.clientId,
      numero_cnj: input.numeroCnj || null,
      vara_comarca: input.varaComarca || null,
      tipo_acao: input.tipoAcao || null,
      area_direito: input.areaDireito || null,
    })
    .select()
    .single()

  if (error || !data) return { error: error?.message ?? 'Não foi possível criar o processo.' }

  revalidatePath(`/clientes/${input.clientId}/processos`)
  redirect(`/clientes/${input.clientId}/processos/${data.id}`)
}

export async function updateProcessoStatusAction(processoId: string, clientId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('processos').update({ status }).eq('id', processoId)

  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}/processos/${processoId}`)
}

export async function createPrazoAction(input: {
  processoId: string
  clientId: string
  tipoPrazo: string
  dataFatal: string
  alertaDiasAntes?: number
}) {
  if (!input.tipoPrazo.trim() || !input.dataFatal) return { error: 'Preencha tipo e data do prazo.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase.from('prazos').insert({
    tenant_id: tenant.id,
    processo_id: input.processoId,
    tipo_prazo: input.tipoPrazo.trim(),
    data_fatal: input.dataFatal,
    alerta_dias_antes: input.alertaDiasAntes ?? 5,
  })

  if (error) return { error: error.message }
  revalidatePath(`/clientes/${input.clientId}/processos/${input.processoId}`)
  revalidatePath('/prazos')
}

export async function markPrazoCumpridoAction(prazoId: string, processoId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('prazos').update({ status: 'cumprido' }).eq('id', prazoId)

  if (error) return { error: error.message }
  revalidatePath(`/clientes/${clientId}/processos/${processoId}`)
  revalidatePath('/prazos')
}
