import Link from 'next/link'
import { MessageSquareText } from 'lucide-react'
import { listConversationsAction } from '@/app/actions/chat'
import { getCurrentTenant } from '@/lib/tenant'
import { getConnectionState } from '@/lib/evolution-admin'
import { deleteImportStatusConversation } from '@/lib/chatwoot-platform'
import { getCurrentAdmin } from '@/lib/admin'
import { ChatApp } from '@/components/atendimento/ChatApp'
import { ConnectWhatsAppButton } from '@/components/atendimento/ConnectWhatsAppButton'
import { DisconnectWhatsAppButton } from '@/components/atendimento/DisconnectWhatsAppButton'
import { RestartEvolutionButton } from '@/components/atendimento/RestartEvolutionButton'

export default async function AtendimentoPage() {
  const tenant = await getCurrentTenant()
  const admin = await getCurrentAdmin()

  // "Tem inbox no Chatwoot" não é o mesmo que "WhatsApp pareado de verdade"
  // — o inbox já existe desde a primeira tentativa de conexão, mesmo que o
  // QR nunca tenha sido escaneado com sucesso (ou a sessão tenha caído
  // depois). Sem checar o estado real da instância aqui, a tela mostrava o
  // chat normalmente mesmo com o WhatsApp nunca conectado de fato.
  const whatsappConnected =
    !!tenant?.evolution_instance_name && (await getConnectionState(tenant.evolution_instance_name)) === 'open'

  if (!whatsappConnected) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-text">Atendimento</h1>
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-6">
          <p className="text-text-secondary">Conecte agora seu WhatsApp</p>
          {tenant && <ConnectWhatsAppButton tenantId={tenant.id} />}
          {admin && <RestartEvolutionButton />}
        </div>
      </div>
    )
  }

  // A Evolution cria uma conversa "init" (contato +123456) durante o
  // handshake de conexão — a exclusão automática que roda no meio do
  // polling de conexão pode disparar antes dela existir de verdade (corrida
  // de tempo). Refaz aqui, toda vez que a tela abre, pra nunca aparecer.
  if (tenant.chatwoot_account_id && tenant.chatwoot_api_token) {
    await deleteImportStatusConversation(tenant.chatwoot_account_id, tenant.chatwoot_api_token).catch(() => {})
  }

  const result = await listConversationsAction()

  if ('error' in result) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-text">Atendimento</h1>
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-6">
          <p className="text-text-secondary">{result.error}</p>
          <ConnectWhatsAppButton tenantId={tenant.id} />
          {admin && <RestartEvolutionButton />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Atendimento</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/configuracoes/lembretes"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <MessageSquareText className="h-4 w-4" />
            <span className="hidden sm:inline">Mensagens de lembrete</span>
          </Link>
          <Link
            href="/configuracoes/mensagens"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <MessageSquareText className="h-4 w-4" />
            <span className="hidden sm:inline">Mensagens personalizadas</span>
          </Link>
          <DisconnectWhatsAppButton tenantId={tenant.id} />
          {admin && <RestartEvolutionButton />}
        </div>
      </div>
      <ChatApp initial={result.conversations} />
    </div>
  )
}
