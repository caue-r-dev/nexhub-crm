'use client'

import { useState, useTransition } from 'react'
import { createProfessionalAction, updateProfessionalAction } from '@/app/actions/professionals'
import { PROFESSIONAL_COLORS } from '@/lib/professional-colors'

export function ProfessionalForm({
  professionalId,
  initial,
}: {
  professionalId?: string
  initial?: { name: string; color: string; active: boolean; registrationNumber?: string }
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? PROFESSIONAL_COLORS[0])
  const [active, setActive] = useState(initial?.active ?? true)
  const [registrationNumber, setRegistrationNumber] = useState(initial?.registrationNumber ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = professionalId
        ? await updateProfessionalAction(professionalId, { name, color, active, registrationNumber })
        : await createProfessionalAction({ name, color, registrationNumber })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Nome</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Dra. Jayne Tofoli"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Cor de identificação</span>
        <div className="flex flex-wrap gap-2">
          {PROFESSIONAL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-accent' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Registro profissional (CRO/CRM)</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
          placeholder="Ex: CRO 12345"
        />
      </label>

      {professionalId && (
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Ativo (aparece na agenda)
        </label>
      )}

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
