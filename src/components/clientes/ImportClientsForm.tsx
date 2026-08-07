'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { importClientsAction, type ImportSummary } from '@/app/actions/clients-import'

export function ImportClientsForm() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setSummary(null)

    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const result = await importClientsAction(formData)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSummary(result)
      router.refresh()
    })
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Arquivo (.csv ou .xlsx)</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent"
          />
        </label>

        <p className="text-xs text-text-secondary">
          Colunas esperadas: <strong>Nome</strong> (obrigatório), Telefone, Documento, Nascimento
          (AAAA-MM-DD ou DD/MM/AAAA), Convênio. Clientes com telefone já cadastrado são ignorados.
        </p>

        {error && <p className="text-sm text-status-cancelled">{error}</p>}

        <button
          type="submit"
          disabled={!file || isPending}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Importando...' : 'Importar'}
        </button>
      </form>

      {summary && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text">
            {summary.imported} cliente{summary.imported === 1 ? '' : 's'} importado
            {summary.imported === 1 ? '' : 's'}.
          </p>
          {summary.skippedDuplicates > 0 && (
            <p className="text-sm text-text-secondary">
              {summary.skippedDuplicates} ignorado{summary.skippedDuplicates === 1 ? '' : 's'} por telefone já
              cadastrado.
            </p>
          )}
          {summary.errors.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-status-cancelled">Avisos:</p>
              <ul className="list-inside list-disc text-sm text-text-secondary">
                {summary.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Linha {e.line}: {e.message}
                  </li>
                ))}
              </ul>
              {summary.errors.length > 20 && (
                <p className="text-xs text-text-secondary">+ {summary.errors.length - 20} outros avisos.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
