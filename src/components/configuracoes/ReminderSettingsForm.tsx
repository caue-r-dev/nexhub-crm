'use client'

import { useState, useTransition } from 'react'
import { updateReminderSettingsAction } from '@/app/actions/reminder-settings'

const DEFAULT_24H =
  'Olá {{nome}}! Passando pra confirmar sua consulta amanhã ({{data}} às {{hora}}) na {{clinica}}. Podemos confirmar sua presença?'
const DEFAULT_2H = 'Olá {{nome}}! Só lembrando que sua consulta é hoje às {{hora}} na {{clinica}}. Te esperamos!'

function preview(template: string) {
  return template
    .replace(/{{\s*nome\s*}}/g, 'Maria')
    .replace(/{{\s*data\s*}}/g, '25/12/2026')
    .replace(/{{\s*hora\s*}}/g, '14:30')
    .replace(/{{\s*clinica\s*}}/g, 'Clínica Exemplo')
}

export function ReminderSettingsForm({
  initialMessage24h,
  initialMessage2h,
}: {
  initialMessage24h: string
  initialMessage2h: string
}) {
  const [message24h, setMessage24h] = useState(initialMessage24h || DEFAULT_24H)
  const [message2h, setMessage2h] = useState(initialMessage2h || DEFAULT_2H)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateReminderSettingsAction({ message24h, message2h })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
      <p className="text-sm text-text-secondary">
        Placeholders disponíveis: <code className="text-text">{'{{nome}}'}</code>{' '}
        <code className="text-text">{'{{data}}'}</code> <code className="text-text">{'{{hora}}'}</code>{' '}
        <code className="text-text">{'{{clinica}}'}</code>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Lembrete 24h antes</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={message24h}
          onChange={(e) => {
            setMessage24h(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(message24h)}</p>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Lembrete 2h antes</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={message2h}
          onChange={(e) => {
            setMessage2h(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(message2h)}</p>
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
