import { getCurrentTenant, getCurrentTenantNicheSlug } from '@/lib/tenant'
import { BookingSettingsForm } from '@/components/configuracoes/BookingSettingsForm'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function AgendamentoPublicoPage() {
  const [tenant, nicheSlug] = await Promise.all([getCurrentTenant(), getCurrentTenantNicheSlug()])
  const terms = nicheTermsFor(nicheSlug)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Agendamento público</h1>
        <p className="text-text-secondary">
          Link que o {terms.personLabelLower} usa pra marcar {terms.bookingWord} sozinho, vendo só horários realmente livres.
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
          personLabelLower={terms.personLabelLower}
        />
      )}
    </div>
  )
}
