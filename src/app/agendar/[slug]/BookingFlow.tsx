'use client'

import { useEffect, useState } from 'react'
import { getAnamneseQuestions, type AnamneseQuestionnaire } from '@/lib/anamnese-questions'
import { ANAMNESE_EVOLUCOES_NICHES } from '@/lib/niche-features'

type Professional = { id: string; name: string }
type ProcedureType = { id: string; name: string }

const EMPTY_ANAMNESE: AnamneseQuestionnaire = { queixa_principal: '', answers: {} }

export function BookingFlow({
  slug,
  professionals,
  procedureTypes,
  nicheSlug,
}: {
  slug: string
  professionals: Professional[]
  procedureTypes: ProcedureType[]
  nicheSlug: string | null
}) {
  const ANAMNESE_QUESTIONS = getAnamneseQuestions(nicheSlug)
  const showAnamnese = !!nicheSlug && ANAMNESE_EVOLUCOES_NICHES.has(nicheSlug)
  const [professionalId, setProfessionalId] = useState('')
  const [procedureTypeId, setProcedureTypeId] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [document, setDocumentValue] = useState('')
  const [phone, setPhone] = useState('')
  const [anamnese, setAnamnese] = useState<AnamneseQuestionnaire>(EMPTY_ANAMNESE)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Duração do slot depende do procedimento escolhido — refaz a busca de
    // horários quando profissional OU procedimento mudam.
    setSlots([])
    setSelectedSlot(null)

    if (!professionalId || !procedureTypeId) {
      return
    }

    setLoadingSlots(true)
    fetch(
      `/api/public/booking/${slug}/availability?professionalId=${professionalId}&procedureTypeId=${procedureTypeId}`
    )
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }, [professionalId, procedureTypeId, slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!professionalId || !procedureTypeId || !selectedSlot || !name.trim() || !phone.trim()) {
      setError('Preencha todos os campos e escolha um horário.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/booking/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId,
          procedureTypeId,
          datetime: selectedSlot,
          patientName: name,
          patientDocument: document,
          patientPhone: phone,
          anamnese,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao agendar.')
        if (res.status === 409) {
          setSlots((prev) => prev.filter((s) => s !== selectedSlot))
          setSelectedSlot(null)
        }
        return
      }
      setSuccess(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-lg font-medium text-text">Agendamento reservado!</p>
        <p className="text-text-secondary">
          Te mandamos o Pix do sinal por WhatsApp. Pague pra confirmar seu horário.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">1. Atendimento</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Profissional</span>
          <select
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            <option value="">Selecione</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Procedimento</span>
          <select
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={procedureTypeId}
            onChange={(e) => setProcedureTypeId(e.target.value)}
          >
            <option value="">Selecione</option>
            {procedureTypes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {professionalId && procedureTypeId && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text">Horário</span>
            {loadingSlots && <p className="text-sm text-text-secondary">Carregando horários...</p>}
            {!loadingSlots && slots.length === 0 && (
              <p className="text-sm text-text-secondary">Nenhum horário disponível nas próximas semanas.</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const date = new Date(slot)
                const label = date.toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-2 py-2 text-xs ${
                      selectedSlot === slot ? 'border-accent bg-accent text-white' : 'border-border bg-bg text-text'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">2. Seus dados</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Nome completo</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">CPF</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={document}
            onChange={(e) => setDocumentValue(e.target.value)}
            placeholder="000.000.000-00"
          />
          <span className="text-xs text-text-secondary">Demais dados são coletados na clínica.</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Seu WhatsApp</span>
          <input
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </label>
      </section>

      {showAnamnese && (
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {nicheSlug === 'advogado' ? '3. Sobre o caso (opcional)' : '3. Ficha de saúde (opcional)'}
        </h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">
            {nicheSlug === 'advogado' ? 'Resuma o caso' : 'O que você está sentindo?'}
          </span>
          <textarea
            rows={2}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            value={anamnese.queixa_principal}
            onChange={(e) => setAnamnese((prev) => ({ ...prev, queixa_principal: e.target.value }))}
          />
        </label>

        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-text">
            {nicheSlug === 'advogado' ? 'Perguntas sobre o caso' : 'Perguntas de saúde (ajuda o profissional a te atender melhor)'}
          </summary>
          <div className="flex flex-col divide-y divide-border border-t border-border">
            {ANAMNESE_QUESTIONS.map((q) => {
              const answer = anamnese.answers[q.id]
              return (
                <div key={q.id} className="flex flex-col gap-2 px-3 py-3">
                  <p className="text-sm text-text">{q.label}</p>
                  <div className="flex gap-4">
                    {(['sim', 'nao', 'nao_sei'] as const).map((opt) => (
                      <label key={opt} className="flex items-center gap-1.5 text-sm text-text">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answer?.value === opt}
                          onChange={() =>
                            setAnamnese((prev) => ({
                              ...prev,
                              answers: { ...prev.answers, [q.id]: { ...prev.answers[q.id], value: opt } },
                            }))
                          }
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
                      onChange={(e) =>
                        setAnamnese((prev) => ({
                          ...prev,
                          answers: { ...prev.answers, [q.id]: { value: prev.answers[q.id]?.value ?? '', info: e.target.value } },
                        }))
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
        </details>
      </section>
      )}

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !selectedSlot}
        className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-40"
      >
        {submitting ? 'Agendando...' : 'Confirmar agendamento'}
      </button>
    </form>
  )
}
