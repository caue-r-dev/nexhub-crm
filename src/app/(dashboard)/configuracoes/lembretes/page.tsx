import { getCurrentTenant } from '@/lib/tenant'
import { ReminderSettingsForm } from '@/components/configuracoes/ReminderSettingsForm'

export default async function LembretesConfigPage() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Mensagens de lembrete</h1>
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
  )
}
