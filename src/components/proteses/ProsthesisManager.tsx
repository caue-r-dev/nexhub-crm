'use client'

import { useState, useTransition } from 'react'
import { createProsthesisAction, updateProsthesisAction, deleteProsthesisAction, type ProsthesisInput } from '@/app/actions/prostheses'

type Prosthesis = {
  id: string
  type: string
  tooth_number: string | null
  status: string
  sent_to_lab_at: string | null
  expected_return_at: string | null
  received_at: string | null
  delivered_at: string | null
  notes: string | null
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'pedido_enviado_lab', label: 'Pedido enviado ao laboratório' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'pronta_lab', label: 'Pronta no laboratório' },
  { value: 'entregue_paciente', label: 'Entregue ao paciente' },
  { value: 'ajuste', label: 'Em ajuste' },
]

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]))

const EMPTY: ProsthesisInput = { type: '', toothNumber: '', status: 'pedido_enviado_lab', sentToLabAt: '', notes: '' }

export function ProsthesisManager({ clientId, initial }: { clientId: string; initial: Prosthesis[] }) {
  const [items, setItems] = useState(initial)
  const [form, setForm] = useState<ProsthesisInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createProsthesisAction(clientId, form)
      if (result && 'error' in result) {
        setError(result.error ?? null)
        return
      }
      setForm(EMPTY)
      window.location.reload()
    })
    void items
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-text">Nova prótese</h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Tipo</span>
            <input
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              placeholder="Ex: Coroa, Prótese total, PPR"
            />
          </label>
          <label className="flex w-32 flex-col gap-1">
            <span className="text-sm font-medium text-text">Dente</span>
            <input
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
              value={form.toothNumber}
              onChange={(e) => setForm((p) => ({ ...p, toothNumber: e.target.value }))}
              placeholder="Opcional"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Status</span>
          <select
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Enviado ao laboratório</span>
            <input
              type="date"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
              value={form.sentToLabAt}
              onChange={(e) => setForm((p) => ({ ...p, sentToLabAt: e.target.value }))}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-text">Previsão de retorno</span>
            <input
              type="date"
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
              value={form.expectedReturnAt}
              onChange={(e) => setForm((p) => ({ ...p, expectedReturnAt: e.target.value }))}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Observações</span>
          <textarea
            rows={2}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </label>

        {error && <p className="text-sm text-status-cancelled">{error}</p>}

        <button
          type="submit"
          disabled={isPending || !form.type.trim()}
          className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : 'Adicionar'}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {items.length ? (
          items.map((p) => <ProsthesisRow key={p.id} clientId={clientId} prosthesis={p} />)
        ) : (
          <p className="text-center text-text-secondary">Nenhuma prótese registrada ainda.</p>
        )}
      </div>
    </div>
  )
}

function ProsthesisRow({ clientId, prosthesis }: { clientId: string; prosthesis: Prosthesis }) {
  const [status, setStatus] = useState(prosthesis.status)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(next: string) {
    setStatus(next)
    startTransition(async () => {
      await updateProsthesisAction(prosthesis.id, clientId, {
        type: prosthesis.type,
        toothNumber: prosthesis.tooth_number ?? undefined,
        status: next,
        sentToLabAt: prosthesis.sent_to_lab_at ?? undefined,
        expectedReturnAt: prosthesis.expected_return_at ?? undefined,
        receivedAt: prosthesis.received_at ?? undefined,
        deliveredAt: prosthesis.delivered_at ?? undefined,
        notes: prosthesis.notes ?? undefined,
      })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProsthesisAction(prosthesis.id, clientId)
      window.location.reload()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-text">
            {prosthesis.type}
            {prosthesis.tooth_number && ` — dente ${prosthesis.tooth_number}`}
          </p>
          {prosthesis.expected_return_at && (
            <p className="text-xs text-text-secondary">
              Previsão: {new Date(`${prosthesis.expected_return_at}T00:00:00`).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={handleDelete} disabled={isPending} className="text-status-cancelled">
              Confirmar
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="text-text-secondary">
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingDelete(true)} className="text-sm text-text-secondary">
            Excluir
          </button>
        )}
      </div>
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isPending}
        className="w-fit rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text outline-none focus:border-accent"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {prosthesis.notes && <p className="text-sm text-text-secondary">{prosthesis.notes}</p>}
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </div>
  )
}
