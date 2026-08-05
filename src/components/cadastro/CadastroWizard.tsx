'use client'

import { useState, useTransition } from 'react'
import { cadastroAction } from '@/app/actions/cadastro'
import { DynamicIcon } from '@/lib/dynamic-icon'
import { PALETTES } from '@/lib/palettes'
import type { Niche } from '@/lib/niches'
import type { PaletteType } from '@/lib/supabase/types'

type Step = 1 | 2 | 3

export function CadastroWizard({ niches }: { niches: Niche[] }) {
  const [step, setStep] = useState<Step>(1)
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nicheId, setNicheId] = useState<string | null>(null)
  const [palette, setPalette] = useState<PaletteType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canAdvanceStep1 = businessName.trim().length > 0 && email.trim().length > 0 && password.length >= 6

  function handleSubmit() {
    if (!nicheId || !palette) return
    setError(null)
    startTransition(async () => {
      const result = await cadastroAction({ businessName, email, password, nicheId, palette })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-accent' : 'bg-border'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-text">Vamos começar</h1>
          <p className="text-text-secondary">Conte um pouco sobre o seu negócio.</p>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Nome do negócio</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Clínica Sorriso"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Email</span>
            <input
              type="email"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Senha</span>
            <input
              type="password"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <button
            disabled={!canAdvanceStep1}
            onClick={() => setStep(2)}
            className="mt-2 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-text">Qual é o seu ramo?</h1>
          <p className="text-text-secondary">O painel já nasce configurado pro seu tipo de negócio.</p>

          <div className="grid grid-cols-2 gap-3">
            {niches.map((n) => (
              <button
                key={n.id}
                onClick={() => setNicheId(n.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
                  nicheId === n.id ? 'border-accent ring-2 ring-accent' : 'border-border'
                } bg-surface`}
              >
                <DynamicIcon name={n.icon} className="h-6 w-6 text-accent" />
                <span className="font-medium text-text">{n.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-border px-4 py-2 text-text">
              Voltar
            </button>
            <button
              disabled={!nicheId}
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-text">Escolha o estilo visual</h1>
          <p className="text-text-secondary">Essa paleta será aplicada em todo o seu painel.</p>

          <div className="flex flex-col gap-3">
            {(Object.entries(PALETTES) as [PaletteType, (typeof PALETTES)[PaletteType]][]).map(
              ([key, p]) => (
                <button
                  key={key}
                  onClick={() => setPalette(key)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    palette === key ? 'border-accent ring-2 ring-accent' : 'border-border'
                  }`}
                  style={{ background: p.bg }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: p.border }}>
                    <span className="text-sm font-semibold" style={{ color: p.text }}>
                      {p.label}
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ background: p.accent }}
                    >
                      Botão
                    </span>
                  </div>
                  <div className="flex gap-3 p-4">
                    <div
                      className="flex-1 rounded-lg border p-3"
                      style={{ background: p.surface, borderColor: p.border }}
                    >
                      <div className="mb-2 h-2 w-2/3 rounded" style={{ background: p.accent }} />
                      <div className="mb-1 h-1.5 w-full rounded" style={{ background: p.border }} />
                      <div className="h-1.5 w-4/5 rounded" style={{ background: p.border }} />
                    </div>
                    <div
                      className="flex-1 rounded-lg border p-3 text-xs"
                      style={{ background: p.surface, borderColor: p.border, color: p.textSecondary }}
                    >
                      Texto secundário de exemplo nesta paleta.
                    </div>
                  </div>
                </button>
              )
            )}
          </div>

          {error && <p className="text-sm text-status-cancelled">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button onClick={() => setStep(2)} className="rounded-lg border border-border px-4 py-2 text-text">
              Voltar
            </button>
            <button
              disabled={!palette || isPending}
              onClick={handleSubmit}
              className="flex-1 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              {isPending ? 'Criando conta...' : 'Concluir cadastro'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
