'use client'

import { useState, useTransition } from 'react'
import { createEvolutionAction } from '@/app/actions/evolutions'
import { RichTextEditor } from './RichTextEditor'

export function EvolutionForm({
  clientId,
  appointments,
}: {
  clientId: string
  appointments: { id: string; label: string }[]
}) {
  const [note, setNote] = useState('')
  const [professional, setProfessional] = useState('')
  const [appointmentId, setAppointmentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formKey, setFormKey] = useState(0)

  const plainText = note.replace(/<[^>]+>/g, '').trim()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createEvolutionAction(clientId, { note, appointmentId, professional })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setNote('')
        setAppointmentId('')
        setFormKey((k) => k + 1)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-text">Nova evolução</h2>

      <div className="flex gap-2">
        <input
          placeholder="Profissional responsável"
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          value={professional}
          onChange={(e) => setProfessional(e.target.value)}
        />
        {appointments.length > 0 && (
          <select
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
          >
            <option value="">Sem consulta vinculada</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <RichTextEditor
        key={formKey}
        value={note}
        onChange={setNote}
        placeholder="Descreva a evolução do tratamento..."
      />

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !plainText}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Adicionar'}
      </button>
    </form>
  )
}
