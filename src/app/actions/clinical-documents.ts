'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createClinicalDocumentAction(input: {
  clientId: string
  professionalId: string
  type: 'atestado' | 'receita'
  content: string
  cid?: string
  examDate?: string
  startTime?: string
  endTime?: string
  convalescence?: boolean
  convalescencePeriod?: string
}) {
  if (!input.professionalId) return { error: 'Selecione o profissional responsável — obrigatório pra atestado e receita.' }
  if (input.type === 'receita' && !input.content.trim()) return { error: 'Informe a medicação/orientação.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clinical_documents')
    .insert({
      tenant_id: tenant.id,
      client_id: input.clientId,
      professional_id: input.professionalId,
      type: input.type,
      content: input.content.trim(),
      cid: input.cid?.trim() || null,
      exam_date: input.examDate || null,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      convalescence: input.convalescence ?? null,
      convalescence_period: input.convalescencePeriod?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Não foi possível gerar o documento.' }

  return { id: data.id }
}
