'use client'

import { useState } from 'react'

export function CopyBrCode({ brCode }: { brCode: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(brCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        readOnly
        value={brCode}
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-secondary outline-none"
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        className="self-start rounded-lg border border-border px-4 py-2 text-sm font-medium text-text"
      >
        {copied ? 'Copiado!' : 'Copiar Pix Copia e Cola'}
      </button>
    </div>
  )
}
