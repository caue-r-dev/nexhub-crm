'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { restartEvolutionAction } from '@/app/actions/evolution-restart'

// Só renderiza se o usuário logado for admin (checado no server, ver
// AtendimentoPage) — reinicia o container inteiro, afeta todos os tenants.
export function RestartEvolutionButton() {
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRestart() {
    setError(null)
    startTransition(async () => {
      const res = await restartEvolutionAction()
      if (res && 'error' in res) {
        setResult('error')
        setError(res.error ?? null)
      } else {
        setResult('ok')
      }
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span className="text-text-secondary">Reinicia pra TODAS as clínicas. Confirma?</span>
        <button type="button" onClick={handleRestart} disabled={isPending} className="font-medium text-status-cancelled">
          {isPending ? 'Reiniciando...' : 'Confirmar'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-text-secondary">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Bug de conexão fantasma (state mente 'open')? Clique pra reiniciar."
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="hidden sm:inline">Reiniciar WhatsApp (bug)</span>
      </button>
      {result === 'ok' && <span className="text-xs text-status-confirmed">Reiniciado!</span>}
      {result === 'error' && error && <span className="text-xs text-status-cancelled">{error}</span>}
    </div>
  )
}
