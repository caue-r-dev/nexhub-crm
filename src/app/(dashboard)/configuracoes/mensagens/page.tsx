import { MessageTemplatesForm } from '@/components/configuracoes/MessageTemplatesForm'
import { BotSettingsForm } from '@/components/configuracoes/BotSettingsForm'
import { getCurrentTenant, getCurrentTenantNicheSlug } from '@/lib/tenant'
import { nicheTermsFor } from '@/lib/niche-terms'

export default async function MensagensConfigPage() {
  const [tenant, nicheSlug] = await Promise.all([getCurrentTenant(), getCurrentTenantNicheSlug()])
  const terms = nicheTermsFor(nicheSlug)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Mensagens automáticas</h1>
        <p className="text-text-secondary">
          Textos usados pelo bot de primeiro contato e pelas automações. Variáveis disponíveis:{' '}
          <code>{'{{nome_clinica}}'}</code>, <code>{'{{endereco}}'}</code>, <code>{'{{horario_atendimento}}'}</code>,{' '}
          <code>{'{{nome_profissional}}'}</code>, <code>{'{{valor_consulta}}'}</code>, <code>{'{{nome_paciente}}'}</code>,{' '}
          <code>{'{{data_consulta}}'}</code>, <code>{'{{horario_consulta}}'}</code>, <code>{'{{procedimento}}'}</code>,{' '}
          <code>{'{{link_agendamento}}'}</code>.
        </p>
      </div>
      {tenant && (
        <BotSettingsForm
          initialBotEnabled={tenant.bot_enabled}
          initialBotContextNotes={tenant.bot_context_notes ?? ''}
          observacoesPlaceholder={terms.observacoesPlaceholder}
        />
      )}
      <MessageTemplatesForm />
    </div>
  )
}
