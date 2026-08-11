'use client'

import { useState, useTransition } from 'react'
import { Globe } from 'lucide-react'
import { requestWebsiteQuoteAction } from '@/app/actions/website-quote'

export function SiteClinicaButton({ websiteUrl }: { websiteUrl: string | null }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (websiteUrl) {
    return (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">Site da clínica</span>
      </a>
    )
  }

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await requestWebsiteQuoteAction()
      if (result && 'error' in result) setError(result.error ?? null)
      else setSent(true)
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || sent}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text disabled:opacity-60 sm:text-sm"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{sent ? 'Solicitado!' : 'Site da clínica'}</span>
      </button>
      {error && <p className="absolute right-0 top-full mt-1 w-56 text-right text-xs text-status-cancelled">{error}</p>}
    </div>
  )
}
