'use client'

import { useState, useTransition } from 'react'
import { createAnimalAction } from '@/app/actions/animals'

export function NewAnimalForm({ clientId }: { clientId: string }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [breed, setBreed] = useState('')
  const [weight, setWeight] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createAnimalAction({
        clientId,
        name,
        species,
        breed,
        weight: Number(weight) || undefined,
        birthDate,
      })
      if (result && 'error' in result) setError(result.error ?? null)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold text-text">Novo animal</h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Nome</span>
        <input
          className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Espécie</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="Ex: Cão"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Raça</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Peso (kg)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Nascimento</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Cadastrar animal'}
      </button>
    </form>
  )
}
