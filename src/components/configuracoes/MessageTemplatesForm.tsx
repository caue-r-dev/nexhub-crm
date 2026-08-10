'use client'

import { useEffect, useState, useTransition } from 'react'
import { listMessageTemplatesAction, updateMessageTemplateAction } from '@/app/actions/message-templates'

type Template = { key: string; label: string; content: string; active: boolean }

export function MessageTemplatesForm() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listMessageTemplatesAction().then((result) => {
      if ('error' in result) setError(result.error ?? null)
      else setTemplates(result.templates)
    })
  }, [])

  if (error) return <p className="text-sm text-status-cancelled">{error}</p>
  if (!templates) return <p className="text-text-secondary">Carregando...</p>

  return (
    <div className="flex flex-col gap-4">
      {templates.map((t) => (
        <TemplateRow key={t.key} template={t} />
      ))}
    </div>
  )
}

function TemplateRow({ template }: { template: Template }) {
  const [content, setContent] = useState(template.content)
  const [active, setActive] = useState(template.active)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateMessageTemplateAction({ key: template.key, content, active })
      if (result && 'error' in result) setError(result.error ?? null)
      else setSaved(true)
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text">{template.label}</span>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked)
              setSaved(false)
            }}
          />
          Ativo
        </label>
      </div>
      <textarea
        rows={3}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setSaved(false)
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
        {error && <span className="text-sm text-status-cancelled">{error}</span>}
        {saved && !isPending && <span className="text-sm text-status-confirmed">Salvo.</span>}
      </div>
    </div>
  )
}
