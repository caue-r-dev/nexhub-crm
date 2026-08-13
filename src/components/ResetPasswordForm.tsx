'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const VERDE = '#0F6E56'

export function ResetPasswordForm() {
  const router = useRouter()
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
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
      router.replace('/painel')
    })
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-8" style={{ backgroundColor: '#F1F0EC' }}>
      <div className="w-full max-w-[400px]">
        {ready === 'checking' && <p className="text-sm text-[#3a3a38]">Verificando link...</p>}

        {ready === 'invalid' && (
          <>
            <h1 className="mb-2 text-2xl font-bold" style={{ color: VERDE }}>
              Link inválido ou expirado
            </h1>
            <p className="text-sm text-[#3a3a38]">
              Peça um novo link em &quot;Esqueci minha senha&quot; na tela de login e abra direto
              do email.
            </p>
          </>
        )}

        {ready === 'ok' && (
          <>
            <h1 className="mb-6 text-2xl font-bold" style={{ color: VERDE }}>
              Definir nova senha
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-bold" style={{ color: VERDE }}>
                  Nova senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-md border border-[#dedbd2] bg-white px-4 text-sm outline-none focus:border-[#0F6E56]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold" style={{ color: VERDE }}>
                  Confirmar senha
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 w-full rounded-md border border-[#dedbd2] bg-white px-4 text-sm outline-none focus:border-[#0F6E56]"
                />
              </div>

              {error && <p className="text-sm text-[#c0392b]">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: VERDE }}
                className="h-12 rounded-md px-8 text-sm font-bold text-white disabled:opacity-40"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
