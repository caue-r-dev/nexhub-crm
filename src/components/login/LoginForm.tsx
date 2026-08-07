'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { loginAction, forgotPasswordAction } from '@/app/actions/login'

const VERDE = '#0F6E56'
const WHATSAPP_NUMBER = '5515981504416'
const LINK_TESTE = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Olá! Quero experimentar o NexHub grátis.'
)}`

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function LoginPanel() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showForgot, setShowForgot] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await loginAction({ email, password: senha })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  if (showForgot) {
    return <ForgotPasswordPanel onBack={() => setShowForgot(false)} initialEmail={email} />
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: VERDE }}>
        Que bom ter você conosco!
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-bold" style={{ color: VERDE }}>
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-md border border-[#dedbd2] bg-white px-4 text-sm outline-none focus:border-[#0F6E56]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-bold" style={{ color: VERDE }}>
            Senha
          </label>
          <div className="relative">
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-12 w-full rounded-md border border-[#dedbd2] bg-white px-4 pr-11 text-sm outline-none focus:border-[#0F6E56]"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7871]"
              aria-label="Mostrar senha"
            >
              <EyeIcon />
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-[#c0392b]">{error}</p>}

        <div className="mt-1 flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            style={{ backgroundColor: VERDE }}
            className="h-12 rounded-md px-8 text-sm font-bold text-white disabled:opacity-40"
          >
            {isPending ? 'Entrando...' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-sm text-[#3a3a38] hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
      </form>

      <p className="mt-6 text-sm" style={{ color: VERDE }}>
        Ainda não tem conta?{' '}
        <a
          href={LINK_TESTE}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold hover:underline"
        >
          Experimente grátis!
        </a>
      </p>
    </>
  )
}

function ForgotPasswordPanel({ onBack, initialEmail }: { onBack: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await forgotPasswordAction({ email })
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <>
        <h1 className="mb-3 text-2xl font-bold" style={{ color: VERDE }}>
          Verifique seu e-mail
        </h1>
        <p className="text-sm text-[#3a3a38]">
          Se <strong>{email}</strong> tiver uma conta, mandamos um link pra você redefinir a senha.
        </p>
        <button type="button" onClick={onBack} className="mt-6 text-sm text-[#3a3a38] hover:underline">
          ← Voltar pro login
        </button>
      </>
    )
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: VERDE }}>
        Redefinir senha
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-bold" style={{ color: VERDE }}>
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-md border border-[#dedbd2] bg-white px-4 text-sm outline-none focus:border-[#0F6E56]"
          />
        </div>

        {error && <p className="text-sm text-[#c0392b]">{error}</p>}

        <div className="mt-1 flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            style={{ backgroundColor: VERDE }}
            className="h-12 rounded-md px-8 text-sm font-bold text-white disabled:opacity-40"
          >
            {isPending ? 'Enviando...' : 'Enviar link'}
          </button>
          <button type="button" onClick={onBack} className="text-sm text-[#3a3a38] hover:underline">
            Voltar
          </button>
        </div>
      </form>
    </>
  )
}

export function LoginForm() {
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row" style={{ backgroundColor: '#F1F0EC' }}>
      <div className="flex w-full items-center justify-center p-8 md:w-1/2 md:p-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 inline-flex items-center gap-2">
            <Image src="/brand/nexhub-icon-petroleo.png" alt="" width={34} height={34} />
            <span className="text-3xl font-extrabold" style={{ color: VERDE }}>
              NexHub
            </span>
          </div>

          <LoginPanel />
        </div>
      </div>

      <div className="h-[320px] w-full overflow-hidden md:h-auto md:w-1/2">
        <Image
          src="/brand/login-foto-final.png"
          alt="Prestadora de serviço usando o NexHub"
          width={1400}
          height={1600}
          priority
          className="h-full w-full object-cover object-top"
        />
      </div>
    </div>
  )
}
