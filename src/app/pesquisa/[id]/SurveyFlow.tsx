'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export function SurveyFlow({
  surveyId,
  tenantName,
  googleReviewLink,
  alreadyResponded,
}: {
  surveyId: string
  tenantName: string
  googleReviewLink: string | null
  alreadyResponded: boolean
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(alreadyResponded)
  const [error, setError] = useState<string | null>(null)

  async function submit(finalRating: number, finalFeedback?: string) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/survey/${surveyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: finalRating, feedback: finalFeedback }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Erro ao enviar.')
        return
      }
      if (finalRating >= 4 && googleReviewLink) {
        window.location.href = googleReviewLink
        return
      }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  function handleStarClick(value: number) {
    setRating(value)
    if (value >= 4) {
      submit(value)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-medium text-text">Obrigado pelo retorno!</p>
        <p className="text-text-secondary">Sua opinião ajuda a {tenantName} a melhorar.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-text">Como foi sua experiência?</h1>
        <p className="text-text-secondary">{tenantName}</p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleStarClick(value)}
            disabled={submitting}
            className="disabled:opacity-40"
          >
            <Star
              className="h-10 w-10"
              style={{ color: 'var(--accent)' }}
              fill={rating !== null && value <= rating ? 'var(--accent)' : 'none'}
            />
          </button>
        ))}
      </div>

      {rating !== null && rating <= 3 && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">O que podemos melhorar?</span>
            <textarea
              rows={4}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Conte pra gente (opcional)"
            />
          </label>
          {error && <p className="text-sm text-status-cancelled">{error}</p>}
          <button
            type="button"
            onClick={() => submit(rating, feedback)}
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-40"
          >
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  )
}
