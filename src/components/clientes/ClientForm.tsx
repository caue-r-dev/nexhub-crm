'use client'

import { useState, useTransition } from 'react'
import { createClientAction, updateClientAction, type ClientInput } from '@/app/actions/clients'

export function ClientForm({
  clientId,
  initial,
}: {
  clientId?: string
  initial?: Partial<ClientInput>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [document, setDocument] = useState(initial?.document ?? '')
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '')
  const [convenio, setConvenio] = useState(initial?.convenio ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input: ClientInput = { name, phone, document, birthDate, convenio }
    startTransition(async () => {
      const result = clientId
        ? await updateClientAction(clientId, input)
        : await createClientAction(input)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Nome</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Telefone</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Documento</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Data de nascimento</span>
        <input
          type="date"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Convênio</span>
        <input
          placeholder="Ex: Particular, Bradesco Dental, Amil..."
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={convenio}
          onChange={(e) => setConvenio(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
