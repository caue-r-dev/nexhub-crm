'use client'

import { useEffect, useState, useTransition } from 'react'
import { listMessageTemplatesAction, updateMessageTemplateAction, hideMessageTemplateAction } from '@/app/actions/message-templates'

type Template = { key: string; label: string; content: string; active: boolean }

export function MessageTemplatesForm() {
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    listMessageTemplatesAction().then((result) => {
      if ('error' in result) setError(result.error ?? null)
      else setTemplates(result.templates)
    })
  }

  useEffect(reload, [])

  if (error) return <p className="text-sm text-status-cancelled">{error}</p>
  if (!templates) return <p className="text-text-secondary">Carregando...</p>

  return (
    <div className="flex flex-col gap-4">
      {templates.map((t) => (
        <TemplateRow key={t.key} template={t} onHidden={reload} />
      ))}
    </div>
  )
}

function TemplateRow({ template, onHidden }: { template: Template; onHidden: () => void }) {
  const [label, setLabel] = useState(template.label)
  const [content, setContent] = useState(template.content)
  const [active, setActive] = useState(template.active)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateMessageTemplateAction({ key: template.key, content, active, label })
      if (result && 'error' in result) setError(result.error ?? null)
      else setSaved(true)
    })
  }

  function handleHide() {
    if (!confirm(`Excluir o card "${label}"? Ele some da lista.`)) return
    startTransition(async () => {
      const result = await hideMessageTemplateAction(template.key)
      if (result && 'error' in result) setError(result.error ?? null)
      else onHidden()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <input
          className="flex-1 rounded-lg border border-border bg-surface px-2 py-1 font-medium text-text outline-none focus:border-accent"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value)
            setSaved(false)
          }}
        />
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
        <button type="button" onClick={handleHide} disabled={isPending} className="text-sm text-status-cancelled hover:underline disabled:opacity-40">
          Excluir
        </button>
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
