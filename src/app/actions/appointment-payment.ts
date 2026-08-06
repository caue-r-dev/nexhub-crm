'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setDepositAmountAction(appointmentId: string, amount: number) {
  if (!amount || amount <= 0) {
    return { error: 'Informe um valor válido.' }
  }

  const supabase = await createClient()

  const { data: current } = await supabase
    .from('appointments')
    .select('payment_status')
    .eq('id', appointmentId)
    .single()

  const { error } = await supabase
    .from('appointments')
    .update({
      deposit_amount: amount,
      payment_status: current?.payment_status === 'nao_solicitado' ? 'aguardando' : current?.payment_status,
    })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath(`/agenda/${appointmentId}/pix`)
}

export async function markAppointmentPaidAction(appointmentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ payment_status: 'confirmado' })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath(`/agenda/${appointmentId}/pix`)
  revalidatePath('/agenda')
}
