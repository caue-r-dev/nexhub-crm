'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// Só checa status nesse intervalo (leve, não gera QR novo — ver comentário
// na rota). QR não é regerado automaticamente: o WhatsApp/Baileys tem
// limite de regeneração e pedir QR novo a cada poucos segundos derruba a
// conexão de vez ("QRCode generation limit reached").
const POLL_MS = 5000

export function ConnectWhatsAppButton({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'starting' | 'connecting' | 'open' | 'error'>('starting')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => stopPolling, [])

  function pollStatus() {
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
      }
    }, POLL_MS)
  }

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
    pollStatus()
  }

  async function refreshQr() {
    setRefreshing(true)
    setRefreshError(null)
    const res = await fetch(`/api/tenants/${tenantId}/connect-whatsapp?refreshQr=1`)
    const data = await res.json()
    setRefreshing(false)
    if (res.ok && data.qrCode) {
      setQrCode(data.qrCode)
    } else if (data.error) {
      setRefreshError(data.error)
    }
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
                <p className="text-xs text-text-secondary">
                  O código expira depois de um tempo. Se parar de funcionar, gere um novo — evite clicar várias
                  vezes seguidas.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={refreshQr}
                    disabled={refreshing}
                    className="text-sm font-medium text-accent disabled:opacity-40"
                  >
                    {refreshing ? 'Gerando...' : 'Gerar novo QR'}
                  </button>
                  <button type="button" onClick={close} className="text-sm font-medium text-text-secondary">
                    Cancelar
                  </button>
                </div>
                {refreshError && <p className="text-sm text-status-cancelled">{refreshError}</p>}
              </>
            )}

            {status === 'open' && <p className="font-medium text-status-confirmed">Conectado!</p>}
          </div>
        </div>
      )}
    </>
  )
}
