'use client'

import { useState, useTransition } from 'react'
import { updateMessageTemplateAction } from '@/app/actions/message-templates'

function TemplateField({
  templateKey,
  label,
  hint,
  initialContent,
}: {
  templateKey: string
  label: string
  hint: string
  initialContent: string
}) {
  const [content, setContent] = useState(initialContent)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateMessageTemplateAction({ key: templateKey, content, active: true, label: '' })
      if (result && 'error' in result) setError(result.error ?? null)
      else setSaved(true)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="font-medium text-text">{label}</p>
        <p className="text-sm text-text-secondary">{hint}</p>
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

export function CampaignTemplatesForm({
  initialSemVisita,
  initialOrcamentoAberto,
}: {
  initialSemVisita: string
  initialOrcamentoAberto: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <TemplateField
        templateKey="campanha_sem_visita"
        label="Sem visita há um tempo"
        hint="Usada quando você dispara uma campanha em /clientes/campanhas pra quem não visita há X dias. Variáveis: {{nome_cliente}}, {{ultima_visita}}."
        initialContent={initialSemVisita}
      />
      <TemplateField
        templateKey="campanha_orcamento_aberto"
        label="Orçamento em aberto"
        hint="Usada quando você dispara uma campanha em /clientes/campanhas pra quem tem orçamento parado há X dias. Variáveis: {{nome_cliente}}, {{valor_orcamento}}."
        initialContent={initialOrcamentoAberto}
      />
    </div>
  )
}
