'use client'

import { useState, useTransition } from 'react'
import { toggleHospitalizedAction, addHospitalizationNoteAction } from '@/app/actions/animals'

type Note = { id: string; note: string; created_at: string }

export function HospitalizationPanel({
  animalId,
  clientId,
  hospitalized,
  currentHospitalizationId,
  notes,
}: {
  animalId: string
  clientId: string
  hospitalized: boolean
  currentHospitalizationId: string | null
  notes: Note[]
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleHospitalizedAction(animalId, clientId, !hospitalized)
    })
  }

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!currentHospitalizationId || !note.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addHospitalizationNoteAction(currentHospitalizationId, animalId, note)
      if (result && 'error' in result) {
        setError(result.error ?? null)
        return
      }
      setNote('')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Internação</h2>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40 ${
            hospitalized ? 'bg-status-cancelled text-white' : 'border border-border text-text'
          }`}
        >
          {hospitalized ? 'Dar alta' : 'Internar'}
        </button>
      </div>

      {hospitalized && (
        <>
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
              placeholder="Medicação, observação, hora..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="submit"
              disabled={isPending || !note.trim()}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Adicionar
            </button>
          </form>
          {error && <p className="text-xs text-status-cancelled">{error}</p>}

          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {notes.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-text-secondary">Nenhuma ocorrência ainda.</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="px-3 py-2 text-sm">
                  <p className="text-xs text-text-secondary">
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-text">{n.note}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
