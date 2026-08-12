'use client'

import { useState, useTransition } from 'react'
import { addVaccineAction } from '@/app/actions/animals'

export function VaccineForm({ animalId }: { animalId: string }) {
  const [vaccineName, setVaccineName] = useState('')
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10))
  const [professional, setProfessional] = useState('')
  const [nextDoseAt, setNextDoseAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addVaccineAction({ animalId, vaccineName, appliedAt, professional, nextDoseAt })
      if (result && 'error' in result) {
        setError(result.error ?? null)
        return
      }
      setVaccineName('')
      setProfessional('')
      setNextDoseAt('')
      setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          placeholder="Vacina (ex: V10)"
          value={vaccineName}
          onChange={(e) => setVaccineName(e.target.value)}
        />
        <input
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          placeholder="Responsável"
          value={professional}
          onChange={(e) => setProfessional(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Aplicada em</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            value={appliedAt}
            onChange={(e) => setAppliedAt(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Próxima dose</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            value={nextDoseAt}
            onChange={(e) => setNextDoseAt(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="text-xs text-status-cancelled">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !vaccineName.trim()}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Salvando...' : 'Registrar vacina'}
        </button>
        {saved && !isPending && <span className="text-xs text-status-confirmed">Salvo.</span>}
      </div>
    </form>
  )
}
