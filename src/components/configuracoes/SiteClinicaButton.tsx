'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Pencil } from 'lucide-react'
import { requestWebsiteQuoteAction, saveWebsiteUrlAction } from '@/app/actions/website-quote'

type Step = 'closed' | 'ask' | 'enter-url' | 'sent' | 'saved'

export function SiteClinicaButton({
  websiteUrl,
  siteLabel,
  businessWord,
}: {
  websiteUrl: string | null
  siteLabel: string
  businessWord: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('closed')
  const [url, setUrl] = useState(websiteUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function requestQuote() {
    setError(null)
    startTransition(async () => {
      const result = await requestWebsiteQuoteAction()
      if (result && 'error' in result) setError(result.error ?? null)
      else setStep('sent')
    })
  }

  function saveUrl(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveWebsiteUrlAction(url)
      if (result && 'error' in result) {
        setError(result.error ?? null)
        return
      }
      setStep('saved')
      router.refresh()
    })
  }

  return (
    <>
      {websiteUrl ? (
        <div className="flex items-center gap-1">
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{siteLabel}</span>
          </a>
          <button
            type="button"
            onClick={() => {
              setUrl(websiteUrl)
              setStep('enter-url')
            }}
            title="Trocar site"
            className="rounded-lg border border-border bg-surface p-2 text-text"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setStep('ask')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{siteLabel}</span>
        </button>
      )}

      {step !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-surface p-6">
            {step === 'ask' && (
              <>
                <p className="font-medium text-text">Seu {businessWord} já tem um site pronto?</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('enter-url')}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
                  >
                    Sim, já tenho
                  </button>
                  <button
                    type="button"
                    onClick={requestQuote}
                    disabled={isPending}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text disabled:opacity-40"
                  >
                    {isPending ? 'Enviando...' : 'Não, quero um orçamento'}
                  </button>
                  <button type="button" onClick={() => setStep('closed')} className="text-sm text-text-secondary">
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {step === 'enter-url' && (
              <form onSubmit={saveUrl} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text">Link do site</span>
                  <input
                    autoFocus
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://minhaclinica.com.br"
                  />
                </label>
                {error && <p className="text-sm text-status-cancelled">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending || !url.trim()}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={() => setStep('closed')} className="text-sm text-text-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {step === 'sent' && (
              <>
                <p className="font-medium text-text">Pedido enviado!</p>
                <p className="text-sm text-text-secondary">Vamos te chamar com um orçamento em breve.</p>
                <button type="button" onClick={() => setStep('closed')} className="self-start text-sm font-medium text-accent">
                  Fechar
                </button>
              </>
            )}

            {step === 'saved' && (
              <>
                <p className="font-medium text-status-confirmed">Site salvo!</p>
                <button type="button" onClick={() => setStep('closed')} className="self-start text-sm font-medium text-accent">
                  Fechar
                </button>
              </>
            )}

            {error && step === 'ask' && <p className="text-sm text-status-cancelled">{error}</p>}
          </div>
        </div>
      )}
    </>
  )
}
