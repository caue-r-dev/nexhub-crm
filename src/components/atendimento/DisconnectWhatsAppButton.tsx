'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function DisconnectWhatsAppButton({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function disconnect() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/tenants/${tenantId}/connect-whatsapp`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao desconectar.')
        return
      }
      setConfirming(false)
      router.refresh()
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-secondary">Desconectar e apagar essa sessão de WhatsApp?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={disconnect}
          className="font-medium text-status-cancelled disabled:opacity-40"
        >
          {isPending ? 'Desconectando...' : 'Confirmar'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-text-secondary">
          Cancelar
        </button>
        {error && <span className="text-status-cancelled">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-medium text-text-secondary hover:text-status-cancelled"
    >
      Desconectar WhatsApp
    </button>
  )
}
