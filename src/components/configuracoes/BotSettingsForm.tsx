'use client'

import { useState, useTransition } from 'react'
import { updateBotSettingsAction } from '@/app/actions/bot-settings'

export function BotSettingsForm({
  initialBotEnabled,
  initialBotContextNotes,
  observacoesPlaceholder,
}: {
  initialBotEnabled: boolean
  initialBotContextNotes: string
  observacoesPlaceholder: string
}) {
  const [botEnabled, setBotEnabled] = useState(initialBotEnabled)
  const [botContextNotes, setBotContextNotes] = useState(initialBotContextNotes)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateBotSettingsAction({ botEnabled, botContextNotes })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={botEnabled}
          onChange={(e) => {
            setBotEnabled(e.target.checked)
            setSaved(false)
          }}
        />
        <span className="text-sm font-medium text-text">Atendimento automático (bot) ativo no WhatsApp</span>
      </label>
      <p className="-mt-2 text-xs text-text-secondary">
        Desligado: o WhatsApp continua recebendo mensagens normalmente no Chatwoot pra atendimento manual, só o bot de
        primeiro contato não responde automaticamente.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Observações pra IA (detalhes específicos do seu negócio)</span>
        <textarea
          rows={4}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={botContextNotes}
          onChange={(e) => {
            setBotContextNotes(e.target.value)
            setSaved(false)
          }}
          placeholder={observacoesPlaceholder}
        />
        <span className="text-xs text-text-secondary">
          Usado pelo bot pra responder perguntas do cliente que fogem do roteiro fixo.
        </span>
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
