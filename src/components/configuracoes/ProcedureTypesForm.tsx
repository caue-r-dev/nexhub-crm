'use client'

import { useState, useTransition } from 'react'
import {
  createProcedureTypeAction,
  toggleProcedureTypeAction,
  updateProcedureTypeDurationAction,
  updateProcedureTypeProtocolAction,
  updateProcedureTypePriceLabelAction,
} from '@/app/actions/procedure-types'

type ProcedureType = {
  id: string
  name: string
  active: boolean
  default_duration_min: number | null
  protocol: string | null
  price_label: string | null
}

export function ProcedureTypesForm({ initial }: { initial: ProcedureType[] }) {
  const [name, setName] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [priceLabel, setPriceLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProcedureTypeAction(name, Number(durationMin) || undefined, priceLabel)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setDurationMin('')
        setPriceLabel('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Novo procedimento</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Limpeza"
            />
          </label>
          <label className="flex w-28 flex-col gap-1">
            <span className="text-sm font-medium text-text">Duração (min)</span>
            <input
              type="number"
              min={5}
              step={5}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="30"
            />
          </label>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Preço (opcional)</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              placeholder="Ex: R$ 150 ou A partir de R$ 480"
            />
            <span className="text-xs text-text-secondary">Aparece no link público de agendamento. Deixe em branco pra não mostrar preço.</span>
          </label>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {initial.map((p) => (
          <ProcedureRow key={p.id} procedure={p} />
        ))}
      </div>
    </div>
  )
}

function ProcedureRow({ procedure }: { procedure: ProcedureType }) {
  const [showProtocol, setShowProtocol] = useState(false)
  const [protocol, setProtocol] = useState(procedure.protocol ?? '')
  const [priceLabel, setPriceLabel] = useState(procedure.price_label ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function saveProtocol() {
    if (protocol === (procedure.protocol ?? '')) return
    startTransition(async () => {
      await updateProcedureTypeProtocolAction(procedure.id, protocol)
      setSaved(true)
    })
  }

  function savePriceLabel() {
    if (priceLabel === (procedure.price_label ?? '')) return
    startTransition(async () => {
      await updateProcedureTypePriceLabelAction(procedure.id, priceLabel)
    })
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text">{procedure.name}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowProtocol((v) => !v)}
            className="text-xs font-medium text-accent"
          >
            {procedure.protocol ? 'Protocolo' : '+ Protocolo'}
          </button>
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={5}
              step={5}
              defaultValue={procedure.default_duration_min ?? ''}
              placeholder="Padrão"
              className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
              onBlur={(e) => {
                const value = e.target.value ? Number(e.target.value) : null
                if (value === procedure.default_duration_min) return
                startTransition(async () => {
                  await updateProcedureTypeDurationAction(procedure.id, value)
                })
              }}
            />
            <span className="text-xs text-text-secondary">min</span>
          </label>
          <input
            type="checkbox"
            checked={procedure.active}
            onChange={(e) =>
              startTransition(async () => {
                await toggleProcedureTypeAction(procedure.id, e.target.checked)
              })
            }
          />
        </div>
      </div>

      <input
        value={priceLabel}
        onChange={(e) => setPriceLabel(e.target.value)}
        onBlur={savePriceLabel}
        placeholder="Preço (opcional) — Ex: R$ 150"
        className="rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
      />

      {showProtocol && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border p-2">
          <span className="text-xs text-text-secondary">
            Protocolo padrão — o profissional lê/ajusta na hora do atendimento.
          </span>
          <textarea
            rows={3}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
            value={protocol}
            onChange={(e) => {
              setProtocol(e.target.value)
              setSaved(false)
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveProtocol}
              disabled={isPending}
              className="self-start rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              {isPending ? 'Salvando...' : 'Salvar protocolo'}
            </button>
            {saved && !isPending && <span className="text-xs text-status-confirmed">Salvo.</span>}
          </div>
        </div>
      )}
    </div>
  )
}
