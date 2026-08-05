import { listConversationsAction } from '@/app/actions/chat'
import { ChatApp } from '@/components/atendimento/ChatApp'

export default async function AtendimentoPage() {
  const result = await listConversationsAction()

  if ('error' in result) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text">Atendimento</h1>
        <p className="text-text-secondary">{result.error}</p>
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
