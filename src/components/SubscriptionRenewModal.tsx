'use client'

import { useEffect, useState } from 'react'
import { generateSubscriptionPixAction } from '@/app/actions/subscription'

export function SubscriptionRenewModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; qrImage: string; brCode: string; amount: number }
  >({ status: 'loading' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateSubscriptionPixAction().then((result) => {
      if ('error' in result) {
        setState({ status: 'error', message: result.error })
        return
      }
      setState({ status: 'ok', ...result })
    })
  }, [])

  async function handleCopy(brCode: string) {
    await navigator.clipboard.writeText(brCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text">Renovar assinatura</h2>

        {state.status === 'loading' && <p className="text-sm text-text-secondary">Gerando QR code...</p>}

        {state.status === 'error' && <p className="text-sm text-status-cancelled">{state.message}</p>}

        {state.status === 'ok' && (
          <>
            <p className="text-sm text-text-secondary">
              Valor: <strong className="text-text">R$ {state.amount.toFixed(2)}</strong>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qrImage} alt="QR Code Pix" className="h-56 w-56 self-center" />
            <textarea
              readOnly
              value={state.brCode}
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary outline-none"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={() => handleCopy(state.brCode)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text"
            >
              {copied ? 'Copiado!' : 'Copiar Pix Copia e Cola'}
            </button>
          </>
        )}

        <button type="button" onClick={onClose} className="text-sm text-text-secondary hover:underline">
          Fechar
        </button>
      </div>
    </div>
  )
}
