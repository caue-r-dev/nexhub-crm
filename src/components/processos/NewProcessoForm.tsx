'use client'

import { useState, useTransition } from 'react'
import { createProcessoAction } from '@/app/actions/processos'

export function NewProcessoForm({ clientId }: { clientId: string }) {
  const [numeroCnj, setNumeroCnj] = useState('')
  const [varaComarca, setVaraComarca] = useState('')
  const [tipoAcao, setTipoAcao] = useState('')
  const [areaDireito, setAreaDireito] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProcessoAction({ clientId, numeroCnj, varaComarca, tipoAcao, areaDireito })
      if (result && 'error' in result) setError(result.error ?? null)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-text">Novo processo</h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Tipo de ação</span>
        <input
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          value={tipoAcao}
          onChange={(e) => setTipoAcao(e.target.value)}
          placeholder="Ex: Ação trabalhista"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Área do direito</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={areaDireito}
            onChange={(e) => setAreaDireito(e.target.value)}
            placeholder="Ex: Trabalhista"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Número CNJ</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={numeroCnj}
            onChange={(e) => setNumeroCnj(e.target.value)}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Vara / comarca</span>
        <input
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          value={varaComarca}
          onChange={(e) => setVaraComarca(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Cadastrar processo'}
      </button>
    </form>
  )
}
