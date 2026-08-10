import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone, fetchWhatsAppProfilePictureUrl } from '@/lib/evolution'
import { confirmAppointment } from '@/lib/appointment-automation'
import { notifyTenantOfBooking } from '@/lib/booking-notifications'
import { sendWelcomeMessageIfConfigured } from '@/lib/welcome-message'
import { resolveTemplate } from '@/lib/message-templates'
import { sendWhatsAppText } from '@/lib/evolution'
import type { AnamneseQuestionnaire } from '@/lib/anamnese-questions'

// Baixa a foto de perfil do WhatsApp do contato e sobe no bucket privado
// client-files, no mesmo padrão usado pelo upload manual — best-effort, uma
// foto a mais ou a menos não pode travar o cadastro do paciente.
async function saveWhatsAppProfilePhoto(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  clientId: string,
  evolutionConfig: { baseUrl: string; apiKey: string; instanceName: string },
  phone: string
) {
  try {
    const pictureUrl = await fetchWhatsAppProfilePictureUrl(evolutionConfig, phone)
    if (!pictureUrl) return

    const imgRes = await fetch(pictureUrl)
    if (!imgRes.ok) return
    const bytes = await imgRes.arrayBuffer()

    const path = `${tenantId}/${clientId}/foto-whatsapp-${Date.now()}.jpg`
    const { error: uploadError } = await admin.storage
      .from('client-files')
      .upload(path, bytes, { contentType: 'image/jpeg' })
    if (uploadError) return

    await admin.from('clients').update({ photo_path: path }).eq('id', clientId)
  } catch {
    // Best-effort — falha aqui nunca deve impedir o agendamento.
  }
}

// Procedimentos com duração igual ou maior a este limiar recebem uma
// orientação extra (chegar mais cedo, reservar bem o horário).
const PROCEDIMENTO_LONGO_MIN = 90

type BookingBody = {
  professionalId: string
  procedureTypeId: string
  datetime: string
  patientName: string
  patientPhone: string
  anamnese?: AnamneseQuestionnaire
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = (await request.json()) as Partial<BookingBody>

  if (!body.professionalId || !body.procedureTypeId || !body.datetime || !body.patientName?.trim() || !body.patientPhone?.trim()) {
    return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 })
  }

  const phone = normalizePhone(body.patientPhone)
  if (!phone || !/^55\d{10,11}$/.test(phone)) {
    return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select(
      'id, name, slot_duration_minutes, buffer_minutes, booking_hold_minutes, notification_phone, evolution_base_url, evolution_api_key, evolution_instance_name, welcome_message'
    )
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404 })
  }

  const { data: procedureType } = await admin
    .from('procedure_types')
    .select('name, default_duration_min')
    .eq('id', body.procedureTypeId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!procedureType) {
    return NextResponse.json({ error: 'Procedimento inválido.' }, { status: 400 })
  }

  const { data: durationOverride } = await admin
    .from('professional_procedure_durations')
    .select('duration_min')
    .eq('professional_id', body.professionalId)
    .eq('procedure_type_id', body.procedureTypeId)
    .maybeSingle()

  const durationMin = durationOverride?.duration_min || procedureType.default_duration_min || tenant.slot_duration_minutes

  const { data: professional } = await admin
    .from('professionals')
    .select('name')
    .eq('id', body.professionalId)
    .eq('tenant_id', tenant.id)
    .single()

  if (!professional) {
    return NextResponse.json({ error: 'Profissional inválido.' }, { status: 400 })
  }

  const requestedStart = new Date(body.datetime)
  const requestedEnd = new Date(requestedStart.getTime() + durationMin * 60_000)
  const bufferMs = tenant.buffer_minutes * 60_000

  // Revalida que o slot ainda está livre (protege contra dois pacientes
  // batendo no mesmo horário entre a consulta de disponibilidade e o submit).
  const { data: conflicting } = await admin
    .from('appointments')
    .select('id, datetime, duration_min')
    .eq('professional_id', body.professionalId)
    .in('status', ['pending', 'confirmed'])
    .gte('datetime', new Date(requestedStart.getTime() - 24 * 3600_000).toISOString())
    .lte('datetime', new Date(requestedStart.getTime() + 24 * 3600_000).toISOString())

  const hasConflict = (conflicting ?? []).some((a) => {
    const aStart = new Date(new Date(a.datetime).getTime() - bufferMs)
    const aEnd = new Date(new Date(a.datetime).getTime() + a.duration_min * 60_000 + bufferMs)
    return requestedStart < aEnd && aStart < requestedEnd
  })

  if (hasConflict) {
    return NextResponse.json({ error: 'Esse horário acabou de ser ocupado. Escolha outro.' }, { status: 409 })
  }

  // Acha cliente existente pelos últimos 8 dígitos do telefone (mesmo
  // critério usado em findPendingAppointmentByPhone) ou cria um novo.
  const last8 = phone.slice(-8)
  const { data: existingClients } = await admin
    .from('clients')
    .select('id, phone')
    .eq('tenant_id', tenant.id)
    .like('phone', `%${last8.slice(-4)}`)
  const match = (existingClients ?? []).find((c) => c.phone?.replace(/\D/g, '').endsWith(last8))

  let clientId = match?.id
  if (!clientId) {
    const { data: newClient, error: clientError } = await admin
      .from('clients')
      .insert({ tenant_id: tenant.id, name: body.patientName.trim(), phone: body.patientPhone.trim() })
      .select('id')
      .single()
    if (clientError || !newClient) {
      return NextResponse.json({ error: clientError?.message ?? 'Erro ao cadastrar paciente.' }, { status: 500 })
    }
    clientId = newClient.id
    await sendWelcomeMessageIfConfigured(tenant, { name: body.patientName.trim(), phone: body.patientPhone.trim() })

    if (tenant.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
      await saveWhatsAppProfilePhoto(
        admin,
        tenant.id,
        clientId,
        { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
        phone
      )
    }
  }

  if (body.anamnese && (body.anamnese.queixa_principal?.trim() || Object.keys(body.anamnese.answers ?? {}).length > 0)) {
    await admin
      .from('anamnesis')
      .upsert(
        { tenant_id: tenant.id, client_id: clientId, questionnaire: body.anamnese, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' }
      )
  }

  const bookingExpiresAt = new Date(Date.now() + tenant.booking_hold_minutes * 60_000).toISOString()

  const { data: appointment, error: apptError } = await admin
    .from('appointments')
    .insert({
      tenant_id: tenant.id,
      type: 'consulta',
      client_id: clientId,
      professional_id: body.professionalId,
      title: procedureType.name,
      datetime: requestedStart.toISOString(),
      duration_min: durationMin,
      status: 'pending',
      source: 'public_booking',
      booking_expires_at: bookingExpiresAt,
    })
    .select('id')
    .single()

  if (apptError || !appointment) {
    return NextResponse.json({ error: apptError?.message ?? 'Erro ao criar agendamento.' }, { status: 500 })
  }

  // Reusa a automação já existente: marca confirmed, manda mensagem de
  // confirmação + Pix do sinal (se a clínica tiver default_deposit_amount
  // configurado) — nenhuma lógica de envio é duplicada aqui.
  const confirmResult = await confirmAppointment(appointment.id)

  if ('error' in confirmResult) {
    await admin.from('appointments').delete().eq('id', appointment.id)
    return NextResponse.json(
      { error: 'Não conseguimos confirmar seu agendamento. Tente novamente ou entre em contato com a clínica.' },
      { status: 500 }
    )
  }

  if (durationMin >= PROCEDIMENTO_LONGO_MIN && tenant.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    try {
      const message = await resolveTemplate(
        tenant.id,
        'orientacao_procedimento_longo',
        { nome_clinica: tenant.name, procedimento: procedureType.name },
        'Só um aviso: seu atendimento vai levar mais tempo que o normal. Pra ficar mais confortável: use roupas leves, pode trazer fone de ouvido, e pode se alimentar normalmente antes. Qualquer coisa é só pedir!'
      )
      await sendWhatsAppText(
        { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
        phone,
        message
      )
    } catch {
      // Aviso extra, não deve quebrar a confirmação do agendamento.
    }
  }

  if (tenant.notification_phone && tenant.evolution_base_url && tenant.evolution_api_key && tenant.evolution_instance_name) {
    try {
      await notifyTenantOfBooking(
        {
          baseUrl: tenant.evolution_base_url,
          apiKey: tenant.evolution_api_key,
          instanceName: tenant.evolution_instance_name,
        },
        tenant.notification_phone,
        {
          clientName: body.patientName.trim(),
          procedureName: procedureType.name,
          professionalName: professional.name,
          datetime: requestedStart.toISOString(),
        }
      )
    } catch {
      // Agendamento já foi criado e confirmado — falha só no aviso da
      // clínica não deve derrubar a resposta pro paciente.
    }
  }

  return NextResponse.json({ ok: true, appointmentId: appointment.id })
}
