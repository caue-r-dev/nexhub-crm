'use client'

import { useState, useTransition } from 'react'
import { createClinicalDocumentAction } from '@/app/actions/clinical-documents'

type Professional = { id: string; name: string }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function ClinicalDocumentGenerator({
  clientId,
  professionals,
}: {
  clientId: string
  professionals: Professional[]
}) {
  const [type, setType] = useState<'atestado' | 'receita'>('atestado')
  const [professionalId, setProfessionalId] = useState('')
  const [content, setContent] = useState('')
  const [cid, setCid] = useState('')
  const [examDate, setExamDate] = useState(todayISO())
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [convalescence, setConvalescence] = useState<'sim' | 'nao'>('nao')
  const [convalescencePeriod, setConvalescencePeriod] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleTypeChange(next: 'atestado' | 'receita') {
    setType(next)
    setContent('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!professionalId) {
      setError('Selecione o profissional responsável — obrigatório pra atestado e receita.')
      return
    }
    startTransition(async () => {
      const result = await createClinicalDocumentAction({
        clientId,
        professionalId,
        type,
        content,
        cid: type === 'atestado' ? cid : undefined,
        examDate: type === 'atestado' ? examDate : undefined,
        startTime: type === 'atestado' ? startTime : undefined,
        endTime: type === 'atestado' ? endTime : undefined,
        convalescence: type === 'atestado' ? convalescence === 'sim' : undefined,
        convalescencePeriod: type === 'atestado' && convalescence === 'sim' ? convalescencePeriod : undefined,
      })
      if ('error' in result) {
        setError(result.error ?? null)
        return
      }
      window.open(`/clientes/${clientId}/documentos/${result.id}/imprimir`, '_blank')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => handleTypeChange('atestado')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'atestado' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Atestado
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('receita')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'receita' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Receita
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">
          Profissional responsável <span className="text-status-cancelled">*</span>
        </span>
        <select
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
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
        {professionals.length === 0 && (
          <span className="text-xs text-status-cancelled">
            Nenhum profissional cadastrado com registro (CRO/CRM) — cadastre um antes de gerar.
          </span>
        )}
      </label>

      {type === 'atestado' ? (
        <>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-text">Data</span>
              <input
                type="date"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-text">Das</span>
              <input
                type="time"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-text">Às</span>
              <input
                type="time"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">CID</span>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              placeholder="Ex: K08.8 (opcional)"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text">Necessita de convalescença?</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-text">
                <input
                  type="radio"
                  name="convalescence"
                  checked={convalescence === 'sim'}
                  onChange={() => setConvalescence('sim')}
                />
                Sim
              </label>
              <label className="flex items-center gap-1.5 text-sm text-text">
                <input
                  type="radio"
                  name="convalescence"
                  checked={convalescence === 'nao'}
                  onChange={() => setConvalescence('nao')}
                />
                Não
              </label>
            </div>
            {convalescence === 'sim' && (
              <input
                className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
                value={convalescencePeriod}
                onChange={(e) => setConvalescencePeriod(e.target.value)}
                placeholder="Período (ex: 3 dias, de 10/08 a 13/08)"
              />
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Observações adicionais</span>
            <textarea
              rows={2}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Opcional"
            />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text">Medicações / orientações</span>
          <textarea
            rows={8}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ex: Amoxicilina 500mg — 1 cápsula de 8/8h por 7 dias"
          />
        </label>
      )}

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Gerando...' : 'Gerar e imprimir'}
      </button>
    </form>
  )
}
