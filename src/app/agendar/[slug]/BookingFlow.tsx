'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAnamneseQuestions, type AnamneseQuestionnaire } from '@/lib/anamnese-questions'
import { ANAMNESE_EVOLUCOES_NICHES } from '@/lib/niche-features'
import { nicheTermsFor } from '@/lib/niche-terms'
import { initials } from '@/lib/professional-colors'

type ProfessionalProfile = {
  id: string
  name: string
  role: string | null
  registrationNumber: string | null
  bio: string | null
  photoUrl: string | null
}
type ProcedureType = { id: string; name: string; price_label: string | null }

const EMPTY_ANAMNESE: AnamneseQuestionnaire = { queixa_principal: '', answers: {} }

// Transforma a lista plana de slots ISO (o que a API já retorna) num
// calendário semanal (um card por dia) igual ao protótipo — puramente
// visual, a API de disponibilidade não muda. Dia da semana e data são
// derivados os dois via Intl no fuso America/Sao_Paulo — usar
// Date.getDay()/getUTCDay() aqui erra o dia sempre que o navegador de
// quem acessa o link está em outro fuso (paciente fora do Brasil, por
// exemplo), porque eles usam o fuso local da máquina, não o do negócio.
function groupSlotsByDay(slots: string[]) {
  const byDay = new Map<string, { label: string; date: string; slots: string[] }>()
  for (const slot of slots) {
    const d = new Date(slot)
    const dayKey = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const label = d
      .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' })
      .replace(/^\w/, (c) => c.toUpperCase())
    const dateLabel = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
    if (!byDay.has(dayKey)) byDay.set(dayKey, { label, date: dateLabel, slots: [] })
    byDay.get(dayKey)!.slots.push(slot)
  }
  return Array.from(byDay.values())
}

export function BookingFlow({
  slug,
  clinicName,
  professionals,
  procedureTypes,
  address,
  latitude,
  longitude,
  nicheSlug,
}: {
  slug: string
  clinicName: string
  professionals: ProfessionalProfile[]
  procedureTypes: ProcedureType[]
  address: string | null
  latitude: number | null
  longitude: number | null
  nicheSlug: string | null
}) {
  const terms = nicheTermsFor(nicheSlug)
  const ANAMNESE_QUESTIONS = getAnamneseQuestions(nicheSlug)
  const showAnamnese = !!nicheSlug && ANAMNESE_EVOLUCOES_NICHES.has(nicheSlug)
  const temMaisDeUmProfissional = professionals.length > 1

  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? '')
  const [procedureTypeId, setProcedureTypeId] = useState('')
  const [convenio, setConvenio] = useState<'sim' | 'nao'>('nao')
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

  const professionalAtual = professionals.find((p) => p.id === professionalId) ?? professionals[0]
  const dias = useMemo(() => groupSlotsByDay(slots), [slots])

  useEffect(() => {
    setSlots([])
    setSelectedSlot(null)

    if (!professionalId || !procedureTypeId) return

    setLoadingSlots(true)
    fetch(`/api/public/booking/${slug}/availability?professionalId=${professionalId}&procedureTypeId=${procedureTypeId}`)
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
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <p className="text-lg font-medium text-text">Agendamento reservado!</p>
        <p className="text-text-secondary">
          Te mandamos o Pix do sinal por WhatsApp. Pague pra confirmar seu horário.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-surface px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-text-secondary">
          <span className="font-bold text-accent">NexHub</span>
          <span>·</span>
          <span>Agendamento online</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1.4fr_1fr] md:items-start md:px-6">
        {/* COLUNA ESQUERDA - PERFIL */}
        <div className="rounded-xl border border-border bg-surface p-6">
          {professionalAtual && (
            <div className="flex items-center gap-4">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-2xl font-bold text-accent">
                {professionalAtual.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={professionalAtual.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(professionalAtual.name)
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-text">{professionalAtual.name}</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  {[professionalAtual.role, professionalAtual.registrationNumber].filter(Boolean).join(' · ')}
                </p>
                {address && <p className="text-sm text-text-secondary">{address}</p>}
              </div>
            </div>
          )}

          {professionalAtual?.bio && (
            <div className="mt-6 border-t border-border pt-5">
              <h2 className="mb-2 text-sm font-bold text-text">Sobre</h2>
              <p className="text-sm leading-relaxed text-text-secondary">{professionalAtual.bio}</p>
            </div>
          )}

          {procedureTypes.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <h2 className="mb-3 text-sm font-bold text-text">Serviços e preços</h2>
              {procedureTypes.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-text">{p.name}</p>
                    {p.price_label && <p className="mt-0.5 text-xs text-text-secondary">{p.price_label}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProcedureTypeId(p.id)}
                    className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white"
                  >
                    Agendar
                  </button>
                </div>
              ))}
            </div>
          )}

          {address && (
            <div className="mt-5 border-t border-border pt-5">
              <h2 className="mb-3 text-sm font-bold text-text">Endereço</h2>
              <p className="mb-3 text-sm text-text-secondary">{address}</p>
              {latitude != null && longitude != null && (
                <iframe
                  title="Localização"
                  width="100%"
                  height="180"
                  style={{ border: 0 }}
                  className="rounded-lg"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                />
              )}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA - AGENDAMENTO */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:sticky md:top-6">
          <h2 className="text-base font-bold text-text">Agendar atendimento</h2>

          {temMaisDeUmProfissional && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-secondary">Profissional</span>
              <select
                className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-secondary">Procedimento</span>
            <select
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              value={procedureTypeId}
              onChange={(e) => setProcedureTypeId(e.target.value)}
            >
              <option value="">Selecione</option>
              {procedureTypes.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary">Tem convênio?</span>
            <div className="flex gap-2">
              {(['sim', 'nao'] as const).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setConvenio(op)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                    convenio === op ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'
                  }`}
                >
                  {op === 'sim' ? 'Sim' : 'Não'}
                </button>
              ))}
            </div>
          </div>

          {professionalId && procedureTypeId && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-text-secondary">Horário</span>
              {loadingSlots && <p className="text-sm text-text-secondary">Carregando horários...</p>}
              {!loadingSlots && dias.length === 0 && (
                <p className="text-sm text-text-secondary">Nenhum horário disponível nas próximas semanas.</p>
              )}
              {dias.length > 0 && (
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${dias.length}, 1fr)` }}>
                  {dias.map((dia) => (
                    <div key={dia.date} className="text-center">
                      <p className="mb-0.5 text-[11px] font-bold text-text">{dia.label}</p>
                      <p className="mb-2 text-[10px] text-text-secondary">{dia.date}</p>
                      {dia.slots.map((slot) => {
                        const label = new Date(slot).toLocaleTimeString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        const isSelected = selectedSlot === slot
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`mb-1.5 block w-full rounded-md border px-0.5 py-1.5 text-[11px] font-semibold ${
                              isSelected ? 'border-accent bg-accent text-white' : 'border-border bg-bg text-text'
                            }`}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <>
              <div className="flex flex-col gap-3 border-t border-border pt-4">
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
                  <span className="text-xs text-text-secondary">
                    Demais dados são coletados {terms.businessWordIn} {terms.businessWord}.
                  </span>
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
              </div>

              {showAnamnese && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <h2 className="text-sm font-semibold text-text">
                    {nicheSlug === 'advogado' ? 'Sobre o caso (opcional)' : 'Ficha de saúde (opcional)'}
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
                </div>
              )}

              {error && <p className="text-sm text-status-cancelled">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-40"
              >
                {submitting ? 'Agendando...' : 'Confirmar agendamento'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
