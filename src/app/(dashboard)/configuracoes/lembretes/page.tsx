import { getCurrentTenant } from '@/lib/tenant'
import { ReminderSettingsForm } from '@/components/configuracoes/ReminderSettingsForm'
import { BudgetFollowupSettingsForm } from '@/components/configuracoes/BudgetFollowupSettingsForm'
import { WelcomeMessageForm } from '@/components/configuracoes/WelcomeMessageForm'

export default async function LembretesConfigPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">Primeiro contato</h1>
          <p className="text-text-secondary">
            Mensagem enviada automaticamente por WhatsApp assim que um paciente novo é cadastrado
            (manualmente ou pelo agendamento público). Deixe em branco pra não enviar nada.
          </p>
        </div>
        {tenant && <WelcomeMessageForm initialMessage={tenant.welcome_message ?? ''} />}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-text">Mensagens de lembrete</h2>
          <p className="text-text-secondary">
            Texto enviado automaticamente por WhatsApp 24h e 2h antes de cada consulta. Deixe em
            branco pra usar o texto padrão.
          </p>
        </div>
        {tenant && (
          <ReminderSettingsForm
            initialMessage24h={tenant.reminder_message_24h ?? ''}
            initialMessage2h={tenant.reminder_message_2h ?? ''}
          />
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-text">Orçamento parado</h2>
          <p className="text-text-secondary">
            Texto enviado automaticamente quando um orçamento fica sem aprovar nem recusar por 3 e
            depois 7 dias. Deixe em branco pra usar o texto padrão.
          </p>
        </div>
        {tenant && (
          <BudgetFollowupSettingsForm
            initialMessageDay3={tenant.budget_followup_message_day3 ?? ''}
            initialMessageDay7={tenant.budget_followup_message_day7 ?? ''}
          />
        )}
      </div>
    </div>
  )
}
