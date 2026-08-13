'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changeTempPasswordAction } from '@/app/actions/change-password'

const VERDE = '#0F6E56'

export function TrocarSenhaForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

    startTransition(async () => {
      const result = await changeTempPasswordAction(password)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.replace('/painel')
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-8" style={{ backgroundColor: '#F1F0EC' }}>
      <div className="w-full max-w-[400px]">
        <h1 className="mb-2 text-2xl font-bold" style={{ color: VERDE }}>
          Defina sua senha
        </h1>
        <p className="mb-6 text-sm text-[#3a3a38]">
          Você entrou com uma senha temporária. Defina uma senha nova antes de continuar.
        </p>

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
            disabled={isPending}
            style={{ backgroundColor: VERDE }}
            className="h-12 rounded-md px-8 text-sm font-bold text-white disabled:opacity-40"
          >
            {isPending ? 'Salvando...' : 'Salvar e continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
