'use client'

import { useState, useTransition } from 'react'
import { createPrazoAction, markPrazoCumpridoAction } from '@/app/actions/processos'

type Prazo = {
  id: string
  tipo_prazo: string
  data_fatal: string
  status: 'pendente' | 'cumprido'
  alerta_dias_antes: number
}

export function PrazosPanel({
  processoId,
  clientId,
  initial,
}: {
  processoId: string
  clientId: string
  initial: Prazo[]
}) {
  const [prazos, setPrazos] = useState(initial)
  const [tipoPrazo, setTipoPrazo] = useState('')
  const [dataFatal, setDataFatal] = useState('')
  const [alertaDias, setAlertaDias] = useState('5')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createPrazoAction({
        processoId,
        clientId,
        tipoPrazo,
        dataFatal,
        alertaDiasAntes: Number(alertaDias) || 5,
      })
      if (result && 'error' in result) {
        setError(result.error ?? null)
        return
      }
      setPrazos((prev) => [
        { id: crypto.randomUUID(), tipo_prazo: tipoPrazo, data_fatal: dataFatal, status: 'pendente', alerta_dias_antes: Number(alertaDias) || 5 },
        ...prev,
      ])
      setTipoPrazo('')
      setDataFatal('')
    })
  }

  function handleMarkDone(id: string) {
    startTransition(async () => {
      await markPrazoCumpridoAction(id, processoId, clientId)
      setPrazos((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'cumprido' } : p)))
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">Prazos</h2>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-secondary">Tipo de prazo</span>
          <input
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={tipoPrazo}
            onChange={(e) => setTipoPrazo(e.target.value)}
            placeholder="Ex: Contestação"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Data fatal</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={dataFatal}
            onChange={(e) => setDataFatal(e.target.value)}
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-xs text-text-secondary">Alerta (dias antes)</span>
          <input
            type="number"
            min={0}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={alertaDias}
            onChange={(e) => setAlertaDias(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !tipoPrazo.trim() || !dataFatal}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Adicionar
        </button>
      </form>
      {error && <p className="text-xs text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {prazos.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-text-secondary">Nenhum prazo cadastrado ainda.</p>
        ) : (
          prazos.map((p) => {
            const overdue = p.status === 'pendente' && p.data_fatal < new Date().toISOString().slice(0, 10)
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className={`font-medium ${p.status === 'cumprido' ? 'text-text-secondary line-through' : overdue ? 'text-status-cancelled' : 'text-text'}`}>
                    {p.tipo_prazo}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {new Date(`${p.data_fatal}T00:00:00`).toLocaleDateString('pt-BR')} · alerta {p.alerta_dias_antes}d antes
                  </p>
                </div>
                {p.status === 'pendente' && (
                  <button
                    type="button"
                    onClick={() => handleMarkDone(p.id)}
                    disabled={isPending}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-text disabled:opacity-40"
                  >
                    Marcar cumprido
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
