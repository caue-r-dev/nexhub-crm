import { listConversationsAction } from '@/app/actions/chat'
import { getCurrentTenant } from '@/lib/tenant'
import { ChatApp } from '@/components/atendimento/ChatApp'
import { ConnectWhatsAppButton } from '@/components/atendimento/ConnectWhatsAppButton'

export default async function AtendimentoPage() {
  const result = await listConversationsAction()

  if ('error' in result) {
    const tenant = await getCurrentTenant()

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-text">Atendimento</h1>
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-6">
          <p className="text-text-secondary">{result.error}</p>
          {tenant && <ConnectWhatsAppButton tenantId={tenant.id} />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-text">Atendimento</h1>
      <ChatApp initial={result.conversations} />
    </div>
  )
}
