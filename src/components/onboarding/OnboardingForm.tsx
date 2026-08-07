'use client'

import { useState, useTransition } from 'react'
import { completeOnboardingAction } from '@/app/actions/onboarding'
import { DynamicIcon } from '@/lib/dynamic-icon'
import { PALETTES } from '@/lib/palettes'
import type { Niche } from '@/lib/niches'
import type { PaletteType } from '@/lib/supabase/types'

type Step = 1 | 2

export function OnboardingForm({ niches }: { niches: Niche[] }) {
  const [step, setStep] = useState<Step>(1)
  const [businessName, setBusinessName] = useState('')
  const [nicheId, setNicheId] = useState<string | null>(null)
  const [palette, setPalette] = useState<PaletteType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!nicheId || !palette) return
    setError(null)
    startTransition(async () => {
      const result = await completeOnboardingAction({ businessName, nicheId, palette })
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-accent' : 'bg-border'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-text">Bem-vindo ao NexHub!</h1>
          <p className="text-text-secondary">Vamos configurar seu painel. Qual o nome do seu negócio?</p>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Nome do negócio</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Clínica Sorriso"
            />
          </label>

          <button
            disabled={businessName.trim().length === 0}
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

          <p className="mt-2 text-sm font-medium text-text">Escolha o estilo visual</p>
          <div className="flex gap-2">
            {(Object.entries(PALETTES) as [PaletteType, (typeof PALETTES)[PaletteType]][]).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setPalette(key)}
                className={`flex-1 rounded-lg border p-3 text-left text-sm font-medium transition ${
                  palette === key ? 'border-accent ring-2 ring-accent' : 'border-border'
                }`}
                style={{ background: p.bg, color: p.text }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-status-cancelled">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-border px-4 py-2 text-text">
              Voltar
            </button>
            <button
              disabled={!nicheId || !palette || isPending}
              onClick={handleSubmit}
              className="flex-1 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              {isPending ? 'Salvando...' : 'Concluir'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
