'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export type BookingSettingsInput = {
  slug: string
  notificationPhone: string
  slotDurationMinutes: number
  bufferMinutes: number
  bookingHoldMinutes: number
  publicBookingEnabled: boolean
}

const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function updateBookingSettingsAction(input: BookingSettingsInput) {
  const slug = input.slug.trim().toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    return { error: 'O link só pode ter letras minúsculas, números e hífen.' }
  }
  if (input.slotDurationMinutes <= 0) {
    return { error: 'Duração do slot precisa ser maior que zero.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      slug,
      notification_phone: input.notificationPhone.trim() || null,
      slot_duration_minutes: input.slotDurationMinutes,
      buffer_minutes: input.bufferMinutes,
      booking_hold_minutes: input.bookingHoldMinutes,
      public_booking_enabled: input.publicBookingEnabled,
    })
    .eq('id', tenant.id)

  if (error) {
    if (error.message.includes('duplicate key')) {
      return { error: 'Esse link já está em uso por outra clínica.' }
    }
    return { error: error.message }
  }

  revalidatePath('/configuracoes/agendamento-publico')
}
