import { getCurrentTenant, getCurrentTenantNicheSlug } from '@/lib/tenant'
import { PixSettingsForm } from '@/components/configuracoes/PixSettingsForm'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function PixConfigPage() {
  const [tenant, nicheSlug] = await Promise.all([getCurrentTenant(), getCurrentTenantNicheSlug()])
  const terms = nicheTermsFor(nicheSlug)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Pix</h1>
        <p className="text-text-secondary">
          Chave usada pra gerar QR Codes de sinal/pagamento antecipado nos agendamentos. O
          dinheiro cai direto na sua conta — não passa pelo NexHub.
        </p>
      </div>
      {tenant && (
        <PixSettingsForm
          initialKey={tenant.pix_key ?? ''}
          initialName={tenant.pix_receiver_name ?? tenant.name}
          initialDefaultDepositAmount={tenant.default_deposit_amount?.toString() ?? ''}
          personLabelLower={terms.personLabelLower}
          bookingWord={terms.bookingWord}
        />
      )}
    </div>
  )
}
