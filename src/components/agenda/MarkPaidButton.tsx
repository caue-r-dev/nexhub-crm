'use client'

import { useTransition } from 'react'
import { markAppointmentPaidAction } from '@/app/actions/appointment-payment'

export function MarkPaidButton({ appointmentId }: { appointmentId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await markAppointmentPaidAction(appointmentId) })}
      className="self-start rounded-lg bg-status-confirmed px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
    >
      {isPending ? 'Confirmando...' : 'Marcar como pago'}
    </button>
  )
}
