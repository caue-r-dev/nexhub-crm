'use client'

import { useState, useTransition } from 'react'
import { upsertAnamnesisAction } from '@/app/actions/anamnesis'
import { ANAMNESE_QUESTIONS, type AnamneseQuestionnaire } from '@/lib/anamnese-questions'

const EMPTY: AnamneseQuestionnaire = {
  queixa_principal: '',
  answers: {},
}

export function AnamnesisForm({
  clientId,
  initial,
}: {
  clientId: string
  initial?: Partial<AnamneseQuestionnaire>
}) {
  const [form, setForm] = useState<AnamneseQuestionnaire>({
    queixa_principal: initial?.queixa_principal ?? '',
    answers: initial?.answers ?? {},
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function setAnswer(id: string, value: 'sim' | 'nao' | 'nao_sei') {
    setForm((prev) => ({
      ...prev,
      answers: { ...prev.answers, [id]: { ...prev.answers[id], value } },
    }))
    setSaved(false)
  }

  function setInfo(id: string, info: string) {
    setForm((prev) => ({
      ...prev,
      answers: { ...prev.answers, [id]: { ...prev.answers[id], value: prev.answers[id]?.value ?? '', info } },
    }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await upsertAnamnesisAction(clientId, form)
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Queixa principal</span>
        <textarea
          rows={2}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={form.queixa_principal}
          onChange={(e) => setForm((prev) => ({ ...prev, queixa_principal: e.target.value }))}
        />
      </label>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {ANAMNESE_QUESTIONS.map((q) => {
          const answer = form.answers[q.id]
          return (
            <div key={q.id} className="flex flex-col gap-2 px-4 py-3">
              <p className="text-sm text-text">{q.label}</p>
              <div className="flex gap-4">
                {(['sim', 'nao', 'nao_sei'] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5 text-sm text-text">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answer?.value === opt}
                      onChange={() => setAnswer(q.id, opt)}
                    />
                    {opt === 'sim' ? 'Sim' : opt === 'nao' ? 'Não' : 'Não sei'}
                  </label>
                ))}
              </div>
              {q.hasInfo && (
                <input
                  placeholder="Informações adicionais"
                  className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
                  value={answer?.info ?? ''}
                  onChange={(e) => setInfo(q.id, e.target.value)}
                />
              )}
            </div>
          )
        })}
      </div>

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
