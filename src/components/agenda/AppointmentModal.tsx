'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAppointmentAction } from '@/app/actions/appointments'
import { createClientQuickAction } from '@/app/actions/clients'
import { createLabelAction } from '@/app/actions/appointment-labels'
import { ClientCombobox } from './ClientCombobox'
import type { AppointmentType } from '@/lib/supabase/types'

type Client = { id: string; name: string; phone?: string | null }
type Label = { id: string; name: string; color: string }
type Professional = { id: string; name: string }
type Package = { id: string; client_id: string; service_name: string; used_sessions: number; total_sessions: number }
type ProfessionalHour = { professional_id: string; weekday: number; start_time: string; end_time: string }
type ExistingAppt = { professional_id: string | null; datetime: string; duration_min: number }

const PRESET_COLORS = ['#0F6E56', '#B45309', '#4F46E5', '#DC2626', '#0891B2', '#7C3AED']

const RETORNO_OPTIONS = [
  { value: '', label: 'Sem retorno' },
  { value: '15d', label: '15 dias' },
  { value: '1m', label: '1 mês' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
]

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function addRetorno(base: Date, code: string): Date {
  const d = new Date(base)
  if (code === '15d') d.setDate(d.getDate() + 15)
  else if (code === '1m') d.setMonth(d.getMonth() + 1)
  else if (code === '3m') d.setMonth(d.getMonth() + 3)
  else if (code === '6m') d.setMonth(d.getMonth() + 6)
  return d
}

// Slots livres do profissional no dia escolhido: horário de funcionamento
// (professional_hours) menos o que já está ocupado (rows carregadas na view
// atual da agenda). Se o usuário mudar a data pra fora do período já
// carregado, a lista pode não refletir ocupação real fora dessa janela.
function computeFreeSlots(
  professionalId: string,
  dateStr: string,
  hours: ProfessionalHour[],
  existing: ExistingAppt[]
): { startMin: number; endMin: number; label: string }[] {
  if (!professionalId || !dateStr) return []
  const [y, m, d] = dateStr.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).getDay()
  const dayHours = hours.filter((h) => h.professional_id === professionalId && h.weekday === weekday)
  if (dayHours.length === 0) return []

  const busy = existing
    .filter((r) => r.professional_id === professionalId)
    .filter((r) => {
      const dt = new Date(r.datetime)
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
    })
    .map((r) => {
      const dt = new Date(r.datetime)
      const start = dt.getHours() * 60 + dt.getMinutes()
      return { start, end: start + r.duration_min }
    })

  const slots: { startMin: number; endMin: number; label: string }[] = []
  const STEP = 30

  for (const range of dayHours) {
    const [sh, sm] = range.start_time.slice(0, 5).split(':').map(Number)
    const [eh, em] = range.end_time.slice(0, 5).split(':').map(Number)
    let cursor = sh * 60 + sm
    const end = eh * 60 + em

    while (cursor + STEP <= end) {
      const slotEnd = cursor + STEP
      const overlaps = busy.some((b) => cursor < b.end && slotEnd > b.start)
      if (!overlaps) {
        const label = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
        slots.push({ startMin: cursor, endMin: slotEnd, label: `${label(cursor)} às ${label(slotEnd)}` })
      }
      cursor += STEP
    }
  }

  return slots
}

export function AppointmentModal({
  clients: initialClients,
  labels: initialLabels,
  professionals,
  packages,
  professionalHours,
  existingAppointments,
  initialDatetime,
  initialProfessionalId,
  onClose,
  personLabel,
  bookingWord,
}: {
  clients: Client[]
  labels: Label[]
  professionals: Professional[]
  packages: Package[]
  professionalHours: ProfessionalHour[]
  existingAppointments: ExistingAppt[]
  initialDatetime?: Date
  initialProfessionalId?: string
  onClose: () => void
  personLabel: string
  bookingWord: string
}) {
  const router = useRouter()
  const [type, setType] = useState<AppointmentType>('consulta')
  const [clients, setClients] = useState(initialClients)
  const [labels, setLabels] = useState(initialLabels)
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [labelId, setLabelId] = useState('')
  const [professionalId, setProfessionalId] = useState(initialProfessionalId ?? '')
  const [packageId, setPackageId] = useState('')
  const [datetime, setDatetime] = useState(toDatetimeLocal(initialDatetime ?? new Date()))
  const [durationMin, setDurationMin] = useState(30)
  const [notes, setNotes] = useState('')
  const [retornoEm, setRetornoEm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  const [showNewLabel, setShowNewLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])
  const [creatingLabel, setCreatingLabel] = useState(false)

  const [showFreeSlots, setShowFreeSlots] = useState(false)

  const freeSlots = useMemo(
    () => computeFreeSlots(professionalId, datetime.slice(0, 10), professionalHours, existingAppointments),
    [professionalId, datetime, professionalHours, existingAppointments]
  )

  async function handleCreateClient() {
    if (!newClientName.trim()) return
    setCreatingClient(true)
    try {
      const result = await createClientQuickAction({ name: newClientName, phone: newClientPhone })
      if ('error' in result) {
        setError(result.error ?? null)
        return
      }
      setClients((prev) => [...prev, result.client])
      setClientId(result.client.id)
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível cadastrar o cliente.')
    } finally {
      setCreatingClient(false)
    }
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    try {
      const result = await createLabelAction({ name: newLabelName, color: newLabelColor })
      if ('error' in result) {
        setError(result.error ?? null)
        return
      }
      setLabels((prev) => [...prev, result.label])
      setLabelId(result.label.id)
      setShowNewLabel(false)
      setNewLabelName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar a etiqueta.')
    } finally {
      setCreatingLabel(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // datetime-local não carrega timezone — new Date() interpreta como horário local
    // do navegador, então convertemos pra ISO (UTC) antes de mandar pro servidor.
    const baseDate = new Date(datetime)
    const isoDatetime = baseDate.toISOString()

    startTransition(async () => {
      const result = await createAppointmentAction({
        type,
        clientId: type === 'consulta' ? clientId : undefined,
        title: type === 'compromisso' ? title : undefined,
        labelId: labelId || undefined,
        professionalId: professionalId || undefined,
        packageId: type === 'consulta' ? packageId || undefined : undefined,
        datetime: isoDatetime,
        durationMin,
        notes,
      })
      if (result && 'error' in result) {
        setError(result.error)
        return
      }

      if (retornoEm && type === 'consulta' && clientId) {
        const retornoDate = addRetorno(baseDate, retornoEm)
        await createAppointmentAction({
          type: 'consulta',
          clientId,
          professionalId: professionalId || undefined,
          datetime: retornoDate.toISOString(),
          durationMin,
          notes: 'Retorno agendado automaticamente.',
        })
      }

      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Novo agendamento</h2>
          <button onClick={onClose} className="text-text-secondary">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-1 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setType('consulta')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm capitalize ${type === 'consulta' ? 'bg-accent text-white' : 'text-text'}`}
            >
              {bookingWord}
            </button>
            <button
              type="button"
              onClick={() => setType('compromisso')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm ${type === 'compromisso' ? 'bg-accent text-white' : 'text-text'}`}
            >
              Compromisso
            </button>
          </div>

          {type === 'consulta' ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-text">{personLabel}</span>
                <ClientCombobox
                  clients={clients}
                  value={clientId}
                  onChange={(id) => {
                    setClientId(id)
                    setPackageId('')
                  }}
                />
              </label>

              {!showNewClient ? (
                <button type="button" onClick={() => setShowNewClient(true)} className="self-start text-sm font-medium text-accent">
                  + Cadastrar novo {personLabel.toLowerCase()}
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <input
                    placeholder="Nome"
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                  <input
                    placeholder="Telefone"
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowNewClient(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={creatingClient || !newClientName.trim()}
                      onClick={handleCreateClient}
                      className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      {creatingClient ? 'Criando...' : 'Criar e selecionar'}
                    </button>
                  </div>
                </div>
              )}

              {clientId &&
                (() => {
                  const clientPackages = packages.filter((p) => p.client_id === clientId && p.used_sessions < p.total_sessions)
                  return clientPackages.length > 0 ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-text">Usar pacote (opcional)</span>
                      <select
                        className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                        value={packageId}
                        onChange={(e) => setPackageId(e.target.value)}
                      >
                        <option value="">Não usar pacote</option>
                        {clientPackages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.service_name} ({p.used_sessions}/{p.total_sessions})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null
                })()}
            </div>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Título</span>
              <input
                placeholder="Ex: Limpeza do ar condicionado"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}

          {professionals.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Profissional</span>
              <select
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
              >
                <option value="">Sem profissional definido</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-text">Data e hora</span>
              <input
                type="datetime-local"
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
            </label>
            <label className="flex w-24 flex-col gap-1">
              <span className="text-sm font-medium text-text">Duração</span>
              <input
                type="number"
                min={5}
                step={5}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </label>
          </div>

          {professionalId && (
            <div>
              <button
                type="button"
                onClick={() => setShowFreeSlots((v) => !v)}
                className="text-sm font-medium text-accent"
              >
                {showFreeSlots ? 'Ocultar horários livres' : '🔍 Encontrar horário livre'}
              </button>
              {showFreeSlots && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-border p-2">
                  {freeSlots.length === 0 ? (
                    <p className="text-xs text-text-secondary">
                      Sem horários livres nesse dia (ou profissional sem expediente cadastrado).
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1">
                      {freeSlots.map((slot) => (
                        <button
                          key={slot.startMin}
                          type="button"
                          onClick={() => {
                            const [y, m, d] = datetime.slice(0, 10).split('-').map(Number)
                            const next = new Date(y, m - 1, d, Math.floor(slot.startMin / 60), slot.startMin % 60)
                            setDatetime(toDatetimeLocal(next))
                            setShowFreeSlots(false)
                          }}
                          className="rounded-md border border-border px-2 py-1 text-left text-xs text-text hover:border-accent"
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Etiqueta</span>
              <select
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                value={labelId}
                onChange={(e) => setLabelId(e.target.value)}
              >
                <option value="">Sem etiqueta</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>

            {!showNewLabel ? (
              <button type="button" onClick={() => setShowNewLabel(true)} className="self-start text-sm font-medium text-accent">
                + Nova etiqueta
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <input
                  placeholder="Nome da etiqueta"
                  className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                />
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewLabelColor(color)}
                      className={`h-6 w-6 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-2 ring-accent' : ''}`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewLabel(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={creatingLabel || !newLabelName.trim()}
                    onClick={handleCreateLabel}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    {creatingLabel ? 'Criando...' : 'Criar e selecionar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {type === 'consulta' && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text">Retornar em</span>
              <select
                className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
                value={retornoEm}
                onChange={(e) => setRetornoEm(e.target.value)}
              >
                {RETORNO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {retornoEm && (
                <span className="text-xs text-text-secondary">
                  Cria automaticamente um segundo agendamento de retorno, no mesmo horário, na data calculada.
                </span>
              )}
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Observações</span>
            <textarea
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text outline-none focus:border-accent"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </label>

          {error && <p className="text-sm text-status-cancelled">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border px-4 py-2 font-medium text-text">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !datetime || (type === 'consulta' ? !clientId : !title.trim())}
              className="flex-1 rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              {isPending ? 'Salvando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
