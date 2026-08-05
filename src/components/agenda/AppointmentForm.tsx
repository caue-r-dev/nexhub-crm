'use client'

import { useState, useTransition } from 'react'
import { createAppointmentAction } from '@/app/actions/appointments'
import { createClientQuickAction } from '@/app/actions/clients'
import { createLabelAction } from '@/app/actions/appointment-labels'
import type { AppointmentType } from '@/lib/supabase/types'

type Client = { id: string; name: string }
type Label = { id: string; name: string; color: string }

const PRESET_COLORS = ['#0F6E56', '#B45309', '#4F46E5', '#DC2626', '#0891B2', '#7C3AED']

export function AppointmentForm({
  clients: initialClients,
  labels: initialLabels,
  defaultDatetime,
}: {
  clients: Client[]
  labels: Label[]
  defaultDatetime?: string
}) {
  const [type, setType] = useState<AppointmentType>('consulta')
  const [clients, setClients] = useState(initialClients)
  const [labels, setLabels] = useState(initialLabels)
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [labelId, setLabelId] = useState('')
  const [datetime, setDatetime] = useState(defaultDatetime ?? '')
  const [durationMin, setDurationMin] = useState(30)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  const [showNewLabel, setShowNewLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])
  const [creatingLabel, setCreatingLabel] = useState(false)

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    setCreatingClient(true)
    const result = await createClientQuickAction({ name: newClientName, phone: newClientPhone })
    setCreatingClient(false)
    if ('error' in result) {
      setError(result.error ?? null)
      return
    }
    setClients((prev) => [...prev, result.client])
    setClientId(result.client.id)
    setShowNewClient(false)
    setNewClientName('')
    setNewClientPhone('')
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    const result = await createLabelAction({ name: newLabelName, color: newLabelColor })
    setCreatingLabel(false)
    if ('error' in result) {
      setError(result.error ?? null)
      return
    }
    setLabels((prev) => [...prev, result.label])
    setLabelId(result.label.id)
    setShowNewLabel(false)
    setNewLabelName('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // datetime-local não carrega timezone — new Date() interpreta como horário local
    // do navegador, então convertemos pra ISO (UTC) antes de mandar pro servidor.
    const isoDatetime = new Date(datetime).toISOString()
    startTransition(async () => {
      const result = await createAppointmentAction({
        type,
        clientId: type === 'consulta' ? clientId : undefined,
        title: type === 'compromisso' ? title : undefined,
        labelId: labelId || undefined,
        datetime: isoDatetime,
        durationMin,
        notes,
      })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setType('consulta')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'consulta' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Consulta
        </button>
        <button
          type="button"
          onClick={() => setType('compromisso')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'compromisso' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Compromisso
        </button>
      </div>

      {type === 'consulta' ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Cliente</span>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {!showNewClient ? (
            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              className="self-start text-sm font-medium text-accent"
            >
              + Cadastrar novo cliente
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <input
                placeholder="Nome"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <input
                placeholder="Telefone"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClient(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-text"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={creatingClient || !newClientName.trim()}
                  onClick={handleCreateClient}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                >
                  {creatingClient ? 'Criando...' : 'Criar e selecionar'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Título</span>
          <input
            placeholder="Ex: Limpeza do ar condicionado"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Data e hora</span>
        <input
          type="datetime-local"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Duração (min)</span>
        <input
          type="number"
          min={5}
          step={5}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Etiqueta</span>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={labelId}
            onChange={(e) => setLabelId(e.target.value)}
          >
            <option value="">Sem etiqueta</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        {!showNewLabel ? (
          <button
            type="button"
            onClick={() => setShowNewLabel(true)}
            className="self-start text-sm font-medium text-accent"
          >
            + Nova etiqueta
          </button>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <input
              placeholder="Nome da etiqueta"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
            />
            <div className="flex gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewLabelColor(color)}
                  className={`h-6 w-6 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-accent' : ''}`}
                  style={{ background: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewLabel(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={creatingLabel || !newLabelName.trim()}
                onClick={handleCreateLabel}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {creatingLabel ? 'Criando...' : 'Criar e selecionar'}
              </button>
            </div>
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Observações</span>
        <textarea
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={
          isPending ||
          !datetime ||
          (type === 'consulta' ? !clientId : !title.trim())
        }
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Criar agendamento'}
      </button>
    </form>
  )
}
