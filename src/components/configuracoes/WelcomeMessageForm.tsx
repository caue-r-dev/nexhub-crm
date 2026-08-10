'use client'

import { useState, useTransition } from 'react'
import { updateWelcomeMessageAction } from '@/app/actions/reminder-settings'

const DEFAULT_MESSAGE =
  'Olá {{nome}}! Que bom ter você por aqui, seja bem-vindo(a) à {{clinica}}. Qualquer dúvida, é só chamar por aqui.'

function preview(template: string) {
  return template.replace(/{{\s*nome\s*}}/g, 'Maria').replace(/{{\s*clinica\s*}}/g, 'Clínica Exemplo')
}

export function WelcomeMessageForm({ initialMessage }: { initialMessage: string }) {
  const [message, setMessage] = useState(initialMessage || DEFAULT_MESSAGE)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateWelcomeMessageAction(message)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Placeholders disponíveis: <code className="text-text">{'{{nome}}'}</code>{' '}
        <code className="text-text">{'{{clinica}}'}</code>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Mensagem de primeiro contato</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(message)}</p>
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
