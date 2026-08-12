import { getCurrentTenant } from '@/lib/tenant'
import { BookingSettingsForm } from '@/components/configuracoes/BookingSettingsForm'

export default async function AgendamentoPublicoPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Agendamento público</h1>
        <p className="text-text-secondary">
          Link que o paciente usa pra marcar consulta sozinho, vendo só horários realmente livres.
        </p>
      </div>
      {tenant && (
        <BookingSettingsForm
          initial={{
            slug: tenant.slug ?? '',
            notificationPhone: tenant.notification_phone ?? '',
            slotDurationMinutes: tenant.slot_duration_minutes,
            bufferMinutes: tenant.buffer_minutes,
            bookingHoldMinutes: tenant.booking_hold_minutes,
            publicBookingEnabled: tenant.public_booking_enabled,
          }}
        />
      )}
    </div>
  )
}
