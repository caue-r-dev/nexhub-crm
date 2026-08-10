'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function createClinicalDocumentAction(input: {
  clientId: string
  professionalId?: string
  type: 'atestado' | 'receita'
  content: string
}) {
  if (!input.content.trim()) return { error: 'Conteúdo é obrigatório.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clinical_documents')
    .insert({
      tenant_id: tenant.id,
      client_id: input.clientId,
      professional_id: input.professionalId || null,
      type: input.type,
      content: input.content.trim(),
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Não foi possível gerar o documento.' }

  return { id: data.id }
}
