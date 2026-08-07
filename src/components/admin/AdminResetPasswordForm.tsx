'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AdminResetPasswordForm() {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Link de recovery/magic link do Supabase chega com a sessão no fragmento
    // da URL (#access_token=...). O client, ao inicializar, detecta e processa
    // isso sozinho (detectSessionInUrl) — só precisamos confirmar que pegou.
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(session ? 'ok' : 'invalid')
    })
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()
    supabase.auth.updateUser({ password }).then(({ error }) => {
      setIsSubmitting(false)
      if (error) {
        setError(error.message)
        return
      }
      router.replace('/admin')
    })
  }

  if (ready === 'checking') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <p className="text-text-secondary">Verificando link...</p>
      </div>
    )
  }

  if (ready === 'invalid') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="mb-2 text-2xl font-semibold text-text">Link inválido ou expirado</h1>
        <p className="text-text-secondary">
          Peça um novo link de acesso (recovery ou magic link) pelo Supabase Dashboard e abra
          direto do email.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold text-text">Definir nova senha</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Nova senha</span>
          <input
            type="password"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Confirmar senha</span>
          <input
            type="password"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-status-cancelled">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar senha'}
        </button>
      </form>
    </div>
  )
}
