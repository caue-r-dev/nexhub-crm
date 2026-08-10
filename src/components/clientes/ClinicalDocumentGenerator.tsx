'use client'

import { useState, useTransition } from 'react'
import { createClinicalDocumentAction } from '@/app/actions/clinical-documents'

type Professional = { id: string; name: string }

const DEFAULT_CONTENT: Record<'atestado' | 'receita', string> = {
  atestado:
    'Atesto para os devidos fins que {{nome}} esteve sob meus cuidados profissionais nesta data, necessitando de _____ dia(s) de afastamento de suas atividades a partir desta data.',
  receita: '',
}

export function ClinicalDocumentGenerator({
  clientId,
  professionals,
}: {
  clientId: string
  professionals: Professional[]
}) {
  const [type, setType] = useState<'atestado' | 'receita'>('atestado')
  const [professionalId, setProfessionalId] = useState('')
  const [content, setContent] = useState(DEFAULT_CONTENT.atestado)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTypeChange(next: 'atestado' | 'receita') {
    setType(next)
    setContent(DEFAULT_CONTENT[next])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createClinicalDocumentAction({
        clientId,
        professionalId: professionalId || undefined,
        type,
        content,
      })
      if ('error' in result) {
        setError(result.error ?? null)
        return
      }
      window.open(`/clientes/${clientId}/documentos/${result.id}/imprimir`, '_blank')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => handleTypeChange('atestado')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'atestado' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Atestado
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('receita')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'receita' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Receita
        </button>
      </div>

      {professionals.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Profissional (assinatura)</span>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <option value="">Sem profissional definido</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">
          {type === 'atestado' ? 'Texto do atestado' : 'Medicações / orientações'}
        </span>
        <textarea
          rows={type === 'atestado' ? 4 : 8}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === 'receita' ? 'Ex: Amoxicilina 500mg — 1 cápsula de 8/8h por 7 dias' : undefined}
        />
        <span className="text-xs text-text-secondary">Placeholder disponível: {'{{nome}}'}</span>
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Gerando...' : 'Gerar e imprimir'}
      </button>
    </form>
  )
}
