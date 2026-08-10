'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { sendWhatsAppText } from '@/lib/evolution'
import { sendSatisfactionSurveyIfConfigured } from '@/lib/satisfaction-survey'
import type { AppointmentStatus, AppointmentType } from '@/lib/supabase/types'

const BR_TZ = 'America/Sao_Paulo'

// Aviso simples de WhatsApp quando a consulta é criada manualmente (dentro
// do CRM) — sem mexer em status nem mandar Pix, isso continua só
// acontecendo no fluxo de confirmação (link público / resposta "sim" no
// lembrete). Best-effort: falha no envio não pode derrubar a criação do
// agendamento.
async function notifyManualBooking(clientId: string, datetime: string, tenant: NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>) {
  if (!tenant.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) return

  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('name, phone').eq('id', clientId).single()
  if (!client?.phone) return

  const date = new Date(datetime)
  const dateLabel = date.toLocaleDateString('pt-BR', { timeZone: BR_TZ })
  const timeLabel = date.toLocaleTimeString('pt-BR', { timeZone: BR_TZ, hour: '2-digit', minute: '2-digit' })
  const firstName = client.name.split(' ')[0]
  const message = `Olá ${firstName}! Sua consulta na ${tenant.name} foi agendada para ${dateLabel} às ${timeLabel}.`

  try {
    await sendWhatsAppText(
      { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
      client.phone,
      message
    )
  } catch {
    // Agendamento já foi criado — falha só no aviso não deve quebrar o fluxo.
  }
}

export type AppointmentInput = {
  type: AppointmentType
  clientId?: string
  title?: string
  labelId?: string
  professionalId?: string
  packageId?: string
  datetime: string
  durationMin: number
  notes?: string
}

export async function createAppointmentAction(input: AppointmentInput) {
  if (!input.datetime) {
    return { error: 'Data/hora é obrigatória.' }
  }
  if (input.type === 'consulta' && !input.clientId) {
    return { error: 'Selecione um cliente para a consulta.' }
  }
  if (input.type === 'compromisso' && !input.title?.trim()) {
    return { error: 'Informe um título para o compromisso.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { error: 'Sessão inválida.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('appointments').insert({
    tenant_id: tenant.id,
    type: input.type,
    client_id: input.type === 'consulta' ? input.clientId : null,
    title: input.type === 'compromisso' ? input.title!.trim() : null,
    label_id: input.labelId || null,
    professional_id: input.professionalId || null,
    package_id: input.packageId || null,
    datetime: input.datetime,
    duration_min: input.durationMin || 30,
    notes: input.notes || null,
  })

  if (error) {
    return { error: error.message }
  }

  if (input.type === 'consulta' && input.clientId) {
    await notifyManualBooking(input.clientId, input.datetime, tenant)
  }

  revalidatePath('/agenda')
  revalidatePath('/clientes')
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus) {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('appointments')
    .select('status, package_id, type')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  if (current && current.package_id && current.status !== 'done' && status === 'done') {
    const { data: pkg } = await supabase
      .from('packages')
      .select('used_sessions')
      .eq('id', current.package_id)
      .single()

    if (pkg) {
      await supabase
        .from('packages')
        .update({ used_sessions: pkg.used_sessions + 1 })
        .eq('id', current.package_id)
    }
  }

  if (current && current.status !== 'done' && status === 'done' && current.type === 'consulta') {
    await sendSatisfactionSurveyIfConfigured(id)
  }

  revalidatePath('/agenda')
  revalidatePath('/clientes')
}

// Só apaga se já estiver cancelado — evita perder um agendamento ativo por
// engano; pra remover outro status, o usuário cancela primeiro.
export async function deleteAppointmentAction(id: string) {
  const supabase = await createClient()

  const { data: current } = await supabase.from('appointments').select('status').eq('id', id).single()
  if (!current || current.status !== 'cancelled') {
    return { error: 'Só é possível apagar agendamentos cancelados.' }
  }

  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/agenda')
  revalidatePath('/clientes')
}
