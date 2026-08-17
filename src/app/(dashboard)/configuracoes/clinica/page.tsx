import { getCurrentTenant, getCurrentTenantNicheSlug } from '@/lib/tenant'
import { ClinicProfileForm } from '@/components/configuracoes/ClinicProfileForm'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function ClinicaConfigPage() {
  const [tenant, nicheSlug] = await Promise.all([getCurrentTenant(), getCurrentTenantNicheSlug()])
  const terms = nicheTermsFor(nicheSlug)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{terms.businessDataLabel}</h1>
        <p className="text-text-secondary">
          Telefone, e-mail e endereço exibidos no cabeçalho dos documentos (orçamentos impressos).
        </p>
      </div>
      {tenant && (
        <ClinicProfileForm
          initialPhone={tenant.phone ?? ''}
          initialEmail={tenant.email ?? ''}
          initialAddress={tenant.address ?? ''}
          initialCnpj={tenant.cnpj ?? ''}
          initialSocialMedia={tenant.social_media ?? ''}
          initialWebsiteUrl={tenant.website_url ?? ''}
          siteLabel={terms.siteLabel}
        />
      )}
    </div>
  )
}
