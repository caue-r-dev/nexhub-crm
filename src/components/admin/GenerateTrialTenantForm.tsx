'use client'

import { useState, useTransition } from 'react'
import { generateTrialTenantAction } from '@/app/actions/admin-tenants'

export function GenerateTrialTenantForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await generateTrialTenantAction(email)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setResult(res)
      setEmail('')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Gerar teste
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium text-text">Email do lead</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? 'Criando...' : 'Criar tenant de teste'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-secondary">
          Cancelar
        </button>
      </form>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      {result && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <p className="text-text-secondary">
            Tenant criado pra <strong>{result.email}</strong>. Senha temporária — repassa pro lead:
          </p>
          <p className="mt-2 font-mono text-base font-semibold text-text">{result.tempPassword}</p>
        </div>
      )}
    </div>
  )
}
