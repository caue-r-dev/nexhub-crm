'use client'

import { useState, useTransition } from 'react'
import { updateGoogleReviewLinkAction } from '@/app/actions/satisfaction'

export function GoogleReviewLinkForm({ initialLink, businessWord }: { initialLink: string; businessWord: string }) {
  const [link, setLink] = useState(initialLink)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateGoogleReviewLinkAction(link)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Link de avaliação do Google</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setSaved(false)
          }}
          placeholder="https://g.page/r/.../review"
        />
        <span className="text-xs text-text-secondary">
          No Google Maps, busque seu {businessWord} → &quot;Peça avaliações&quot; (ou Google Business Profile
          → &quot;Receber mais avaliações&quot;) → copie o link e cole aqui.
        </span>
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
