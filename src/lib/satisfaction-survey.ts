import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/evolution'

// Best-effort: chamado quando um agendamento (tipo consulta) vira "Realizado".
// Cria a pesquisa (se ainda não existir pra esse agendamento) e manda o link
// por WhatsApp. Nota >=4 no link publico redireciona pro Google Maps da
// clinica (tenant.google_review_link); nota <=3 vira feedback privado.
export async function sendSatisfactionSurveyIfConfigured(appointmentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: appt } = await supabase
    .from('appointments')
    .select('client_id, tenants(id, name, evolution_base_url, evolution_api_key, evolution_instance_name), clients(name, phone)')
    .eq('id', appointmentId)
    .single()

  if (!appt || !appt.client_id) return

  const tenant = appt.tenants as unknown as {
    id: string
    name: string
    evolution_base_url: string | null
    evolution_api_key: string | null
    evolution_instance_name: string | null
  } | null
  const client = appt.clients as unknown as { name: string; phone: string | null } | null

  if (!tenant || !client?.phone) return
  if (!tenant.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) return

  const { data: existing } = await supabase
    .from('satisfaction_surveys')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (existing) return

  const { data: survey, error } = await supabase
    .from('satisfaction_surveys')
    .insert({ tenant_id: tenant.id, client_id: appt.client_id, appointment_id: appointmentId })
    .select('id')
    .single()

  if (error || !survey) return

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://nexhub.nexvix.com.br'
  const surveyUrl = `${origin}/pesquisa/${survey.id}`
  const firstName = client.name.trim().split(' ')[0]
  const message = `Olá ${firstName}! Como foi sua experiência na ${tenant.name}? Sua opinião é muito importante: ${surveyUrl}`

  try {
    await sendWhatsAppText(
      { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
      client.phone,
      message
    )
  } catch {
    // Pesquisa já foi criada — falha só no envio do WhatsApp não derruba o fluxo.
  }
}
