'use client'

import { useState, useTransition } from 'react'
import { createServiceAction, toggleServiceAction, updateServiceAction, deleteServiceAction } from '@/app/actions/services'

type Service = { id: string; name: string; default_value: number; active: boolean }

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ServiceRow({ service }: { service: Service }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(service.name)
  const [value, setValue] = useState(String(service.default_value))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateServiceAction(service.id, name, Number(value) || 0)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setEditing(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`Excluir "${service.name}"?`)) return
    startTransition(async () => {
      await deleteServiceAction(service.id)
    })
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-end gap-2">
          <input
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-24 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-sm text-status-cancelled">{error}</p>}
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3">
      <span className="text-sm text-text">
        {service.name} <span className="text-text-secondary">— {formatBRL(service.default_value)}</span>
      </span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-sm text-accent hover:underline">
          Editar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-sm text-status-cancelled hover:underline disabled:opacity-40"
        >
          Excluir
        </button>
        <input
          type="checkbox"
          checked={service.active}
          onChange={(e) =>
            startTransition(async () => {
              await toggleServiceAction(service.id, e.target.checked)
            })
          }
        />
      </div>
    </div>
  )
}

export function ServicesForm({ initial }: { initial: Service[] }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createServiceAction(name, Number(value) || 0)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setName('')
        setValue('')
      }
    })
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-text">Novo serviço</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Restauração em resina"
          />
        </label>
        <label className="flex w-28 flex-col gap-1">
          <span className="text-sm font-medium text-text">Valor</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          Adicionar
        </button>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {initial.map((s) => (
          <ServiceRow key={s.id} service={s} />
        ))}
      </div>
    </div>
  )
}
