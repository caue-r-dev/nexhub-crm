'use client'

import { useState, useTransition } from 'react'
import { generateTempPasswordAction } from '@/app/actions/admin-tenants'

export function TenantUsersPanel({ users }: { users: { id: string; email: string }[] }) {
  const [result, setResult] = useState<{ userId: string; email: string; tempPassword: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleGenerate(userId: string) {
    setError(null)
    setResult(null)
    startTransition(async () => {
      const res = await generateTempPasswordAction(userId)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setResult({ userId, email: res.email, tempPassword: res.tempPassword })
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <span className="text-sm font-medium text-text">Acesso do cliente</span>

      {users.length === 0 && <p className="text-sm text-text-secondary">Nenhum usuário cadastrado.</p>}

      <ul className="flex flex-col gap-2">
        {users.map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-text">{user.email}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleGenerate(user.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text disabled:opacity-40"
            >
              Gerar senha temporária
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      {result && (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <p className="text-text-secondary">
            Senha temporária pra <strong>{result.email}</strong> — repassa pro cliente e peça pra
            trocar assim que entrar. Isso não fica salvo em nenhum lugar, só aparece essa vez.
          </p>
          <p className="mt-2 font-mono text-base font-semibold text-text">{result.tempPassword}</p>
        </div>
      )}
    </div>
  )
}
