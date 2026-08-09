'use client'

import { useState, useTransition } from 'react'
import { updateBudgetFollowupSettingsAction } from '@/app/actions/budget-followup-settings'

const DEFAULT_DAY3 =
  'Olá {{nome}}! Vi que seu orçamento de {{valor}} na {{clinica}} ainda tá em aberto. Posso te ajudar a agendar?'
const DEFAULT_DAY7 =
  'Olá {{nome}}! Seu orçamento de {{valor}} na {{clinica}} continua disponível. Quer que eu já deixe seu horário marcado?'

function preview(template: string) {
  return template
    .replace(/{{\s*nome\s*}}/g, 'Maria')
    .replace(/{{\s*valor\s*}}/g, 'R$ 350,00')
    .replace(/{{\s*clinica\s*}}/g, 'Clínica Exemplo')
}

export function BudgetFollowupSettingsForm({
  initialMessageDay3,
  initialMessageDay7,
}: {
  initialMessageDay3: string
  initialMessageDay7: string
}) {
  const [messageDay3, setMessageDay3] = useState(initialMessageDay3 || DEFAULT_DAY3)
  const [messageDay7, setMessageDay7] = useState(initialMessageDay7 || DEFAULT_DAY7)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateBudgetFollowupSettingsAction({ messageDay3, messageDay7 })
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
        <code className="text-text">{'{{valor}}'}</code> <code className="text-text">{'{{clinica}}'}</code>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Orçamento parado há 3 dias</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={messageDay3}
          onChange={(e) => {
            setMessageDay3(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(messageDay3)}</p>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Orçamento parado há 7 dias</span>
        <textarea
          rows={3}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={messageDay7}
          onChange={(e) => {
            setMessageDay7(e.target.value)
            setSaved(false)
          }}
        />
        <p className="text-xs text-text-secondary">Prévia: {preview(messageDay7)}</p>
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
