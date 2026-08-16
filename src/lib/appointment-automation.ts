// Lógica compartilhada de confirmar/cancelar agendamento — usada tanto pelos
// endpoints HTTP (/api/automations/appointments/*, chamados manualmente ou
// pelo n8n) quanto pelo webhook de resposta do WhatsApp
// (/api/webhooks/chatwoot), que interpreta "sim"/"não" na resposta do
// paciente e chama essas mesmas funções direto, sem round-trip HTTP.
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWhatsAppText, sendWhatsAppImage } from '@/lib/evolution'
import { generatePixQr } from '@/lib/pix'
import { resolveTemplate } from '@/lib/message-templates'

type TenantEvolutionFields = {
  name: string
  address: string | null
  evolution_base_url: string | null
  evolution_api_key: string | null
  evolution_instance_name: string | null
}

export async function confirmAppointment(
  appointmentId: string
): Promise<{ error: string } | { ok: true; pixSent: boolean; reason?: string }> {
  const admin = createAdminClient()

  const { data: appt, error: fetchError } = await admin
    .from('appointments')
    .select(
      'id, tenant_id, deposit_amount, client_id, clients(name, phone), tenants(name, address, evolution_base_url, evolution_api_key, evolution_instance_name, pix_key, pix_receiver_name, default_deposit_amount)'
    )
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appt) {
    return { error: fetchError?.message ?? 'Agendamento não encontrado.' }
  }

  const client = appt.clients as unknown as { name: string; phone: string | null } | null
  const tenant = appt.tenants as unknown as
    | (TenantEvolutionFields & {
        pix_key: string | null
        pix_receiver_name: string | null
        default_deposit_amount: number | null
      })
    | null

  const depositAmount = appt.deposit_amount ?? tenant?.default_deposit_amount ?? null

  const { error: updateError } = await admin
    .from('appointments')
    .update({
      status: 'confirmed',
      ...(appt.deposit_amount == null && depositAmount != null
        ? { deposit_amount: depositAmount, payment_status: 'aguardando' }
        : {}),
    })
    .eq('id', appointmentId)

  if (updateError) return { error: updateError.message }

  if (!client?.phone || !tenant?.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) {
    return { ok: true, pixSent: false, reason: 'Sem telefone ou WhatsApp não configurado.' }
  }

  const evolutionConfig = {
    baseUrl: tenant.evolution_base_url,
    apiKey: tenant.evolution_api_key,
    instanceName: tenant.evolution_instance_name,
  }

  try {
    const message = await resolveTemplate(
      appt.tenant_id,
      'agendamento_confirmado',
      {
        nome_clinica: tenant.name,
        nome_paciente: client.name,
        endereco: tenant.address ?? '',
        valor_sinal: depositAmount != null ? `R$ ${depositAmount.toFixed(2)}` : '',
      },
      `Agendado! Pra facilitar sua vinda: aceitamos Pix, cartão e dinheiro. Te esperamos na ${tenant.name}!`
    )
    await sendWhatsAppText(evolutionConfig, client.phone, message)
  } catch (e) {
    return { ok: true, pixSent: false, reason: e instanceof Error ? e.message : 'Erro ao enviar confirmação.' }
  }

  if (!tenant.pix_key || !depositAmount) {
    return { ok: true, pixSent: false, reason: 'Sem chave Pix ou valor de sinal configurado.' }
  }

  const pix = await generatePixQr({
    pixKey: tenant.pix_key,
    receiverName: tenant.pix_receiver_name ?? tenant.name,
    amount: depositAmount,
    txid: appointmentId,
  })

  if ('error' in pix) return { ok: true, pixSent: false, reason: pix.error }

  try {
    // Duas mensagens separadas — a segunda só com o copia-e-cola, sem texto
    // junto, pra dar pra selecionar/copiar no WhatsApp sem pegar lixo.
    await sendWhatsAppImage(
      evolutionConfig,
      client.phone,
      pix.qrImage,
      `Pix do sinal para confirmar na agenda. Valor: R$ ${depositAmount.toFixed(2)}`
    )
    await sendWhatsAppText(evolutionConfig, client.phone, pix.brCode)
  } catch (e) {
    return { ok: true, pixSent: false, reason: e instanceof Error ? e.message : 'Erro ao enviar Pix.' }
  }

  return { ok: true, pixSent: true }
}

export async function cancelAppointment(
  appointmentId: string,
  message = 'Tudo bem, obrigado por avisar! Sua consulta na {tenant} foi cancelada. Quer remarcar pra outro dia?'
): Promise<{ error: string } | { ok: true }> {
  const admin = createAdminClient()

  const { data: appt, error: fetchError } = await admin
    .from('appointments')
    .select('id, clients(name, phone), tenants(name, evolution_base_url, evolution_api_key, evolution_instance_name)')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appt) {
    return { error: fetchError?.message ?? 'Agendamento não encontrado.' }
  }

  const { error: updateError } = await admin.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId)
  if (updateError) return { error: updateError.message }

  const client = appt.clients as unknown as { name: string; phone: string | null } | null
  const tenant = appt.tenants as unknown as TenantEvolutionFields | null

  if (client?.phone && tenant?.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    try {
      await sendWhatsAppText(
        {
          baseUrl: tenant.evolution_base_url,
          apiKey: tenant.evolution_api_key,
          instanceName: tenant.evolution_instance_name,
        },
        client.phone,
        message.replace('{tenant}', tenant.name)
      )
    } catch {
      // Status já foi atualizado — falha só no aviso não deve quebrar a automação.
    }
  }

  return { ok: true }
}

// Acha o agendamento mais recente ainda aguardando confirmação (status
// pending, data no futuro) do telefone que respondeu — é nele que a
// resposta de texto livre do WhatsApp ("sim"/"não") deve ser aplicada.
// Mais de um cliente pode compartilhar o mesmo telefone (ex: família
// agendando por um número só) — não dá pra assumir o primeiro que bate é o
// certo, tem que achar entre TODOS esses clientes qual tem o agendamento
// pendente de verdade.
export async function findPendingAppointmentByPhone(tenantId: string, phone: string) {
  const admin = createAdminClient()
  const digits = phone.replace(/\D/g, '')

  const { data: clients } = await admin
    .from('clients')
    .select('id, phone')
    .eq('tenant_id', tenantId)
    .not('phone', 'is', null)

  const matchingClientIds = (clients ?? [])
    .filter((c) => c.phone?.replace(/\D/g, '').endsWith(digits.slice(-8)))
    .map((c) => c.id)

  if (matchingClientIds.length === 0) return null

  const { data: appt } = await admin
    .from('appointments')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('client_id', matchingClientIds)
    .eq('status', 'pending')
    .gte('datetime', new Date().toISOString())
    .order('datetime', { ascending: true })
    .limit(1)
    .maybeSingle()

  return appt?.id ?? null
}
