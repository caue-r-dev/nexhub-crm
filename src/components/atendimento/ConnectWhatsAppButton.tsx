'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const POLL_MS = 4000

export function ConnectWhatsAppButton({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'starting' | 'connecting' | 'open' | 'error'>('starting')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => stopPolling, [])

  async function start() {
    setOpen(true)
    setStatus('starting')
    setError(null)

    const res = await fetch(`/api/tenants/${tenantId}/connect-whatsapp`, { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setStatus('error')
      setError(data.error ?? 'Erro ao iniciar conexão.')
      return
    }

    setQrCode(data.qrCode)
    setStatus('connecting')

    pollRef.current = setInterval(async () => {
      const pollRes = await fetch(`/api/tenants/${tenantId}/connect-whatsapp`)
      const pollData = await pollRes.json()

      if (!pollRes.ok) return

      if (pollData.status === 'open') {
        stopPolling()
        setStatus('open')
        setTimeout(() => {
          setOpen(false)
          router.refresh()
        }, 1500)
        return
      }

      if (pollData.qrCode) setQrCode(pollData.qrCode)
    }, POLL_MS)
  }

  function close() {
    stopPolling()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Conectar WhatsApp
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-surface p-6 text-center">
            {status === 'starting' && <p className="text-text-secondary">Criando conexão...</p>}

            {status === 'error' && (
              <>
                <p className="text-status-cancelled">{error}</p>
                <button type="button" onClick={close} className="text-sm font-medium text-accent">
                  Fechar
                </button>
              </>
            )}

            {status === 'connecting' && (
              <>
                <p className="font-medium text-text">Escaneie o QR Code</p>
                <p className="text-sm text-text-secondary">
                  Abra o WhatsApp no celular do número que vai atender &gt; Aparelhos conectados &gt; Conectar
                  aparelho &gt; escaneie este código.
                </p>
                {qrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCode} alt="QR Code de conexão" className="h-64 w-64" />
                ) : (
                  <p className="text-text-secondary">Gerando QR Code...</p>
                )}
                <button type="button" onClick={close} className="text-sm font-medium text-text-secondary">
                  Cancelar
                </button>
              </>
            )}

            {status === 'open' && <p className="font-medium text-status-confirmed">Conectado!</p>}
          </div>
        </div>
      )}
    </>
  )
}
