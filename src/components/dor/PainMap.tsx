'use client'

import { useState, useTransition } from 'react'
import { addPainPointAction, deletePainPointAction, type PainPointView } from '@/app/actions/pain-points'
import { FRONT_REGIONS, BACK_REGIONS, findBodyRegion } from '@/lib/body-regions'

type PainPoint = {
  id: string
  view: PainPointView
  x: number
  y: number
  note: string
  region: string | null
  created_at: string
}

function BodyView({
  clientId,
  view,
  points,
  onAdded,
  onDeleted,
}: {
  clientId: string
  view: PainPointView
  points: PainPoint[]
  onAdded: (p: PainPoint) => void
  onDeleted: (id: string) => void
}) {
  const [pending, setPending] = useState<{ x: number; y: number; region: string } | null>(null)
  const [openPointId, setOpenPointId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const region = findBodyRegion(view, x, y)
    setPending({ x, y, region: region?.id ?? '' })
    setNote('')
    setOpenPointId(null)
  }

  function confirmPending() {
    if (!pending || !note.trim()) return
    const regionLabel = regions.find((r) => r.id === pending.region)?.label
    startTransition(async () => {
      const result = await addPainPointAction({
        clientId,
        view,
        x: pending.x,
        y: pending.y,
        note,
        region: regionLabel,
      })
      if (!('error' in result) && result.point) {
        onAdded(result.point as PainPoint)
      }
      setPending(null)
      setNote('')
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePainPointAction(id, clientId)
      onDeleted(id)
    })
    setOpenPointId(null)
  }

  return (
    <div
      className="relative mx-auto aspect-[147/318] w-full max-w-[220px] cursor-crosshair select-none"
      onClick={handleImageClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={view === 'front' ? '/assets/body-front.svg' : '/assets/body-back.svg'}
        alt={view === 'front' ? 'Corpo — vista frontal' : 'Corpo — vista de costas'}
        className="pointer-events-none h-full w-full"
        draggable={false}
      />

      {points.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setPending(null)
            setOpenPointId((id) => (id === p.id ? null : p.id))
          }}
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-status-cancelled shadow"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          title={p.region ? `${p.region} — ${p.note}` : p.note}
        />
      ))}

      {pending && (
        <div
          className="absolute z-10 w-52 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 shadow-lg"
          style={{ left: `${pending.x}%`, top: `${pending.y}%` }}
          onClick={(e) => e.stopPropagation()}
        >
          <select
            className="mb-1 w-full rounded-md border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
            value={pending.region}
            onChange={(e) => setPending((prev) => (prev ? { ...prev, region: e.target.value } : prev))}
          >
            <option value="">Região não identificada</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <textarea
            autoFocus
            rows={2}
            placeholder="Descreva a dor..."
            className="w-full rounded-md border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              disabled={isPending || !note.trim()}
              onClick={confirmPending}
              className="flex-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-md border border-border px-2 py-1 text-xs text-text"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {openPointId &&
        (() => {
          const p = points.find((pt) => pt.id === openPointId)
          if (!p) return null
          return (
            <div
              className="absolute z-10 w-48 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 shadow-lg"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {p.region && <p className="text-xs font-semibold text-text">{p.region}</p>}
              <p className="text-xs text-text">{p.note}</p>
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="mt-1 text-xs text-status-cancelled hover:underline"
              >
                Excluir ponto
              </button>
            </div>
          )
        })()}
    </div>
  )
}

export function PainMap({ clientId, initial }: { clientId: string; initial: PainPoint[] }) {
  const [points, setPoints] = useState(initial)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Clique no corpo pra marcar um ponto de dor — a região é reconhecida automaticamente, mas pode
        trocar antes de salvar. Clique num ponto já marcado pra ver ou excluir.
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Frente</span>
          <BodyView
            clientId={clientId}
            view="front"
            points={points.filter((p) => p.view === 'front')}
            onAdded={(p) => setPoints((prev) => [...prev, p])}
            onDeleted={(id) => setPoints((prev) => prev.filter((p) => p.id !== id))}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Costas</span>
          <BodyView
            clientId={clientId}
            view="back"
            points={points.filter((p) => p.view === 'back')}
            onAdded={(p) => setPoints((prev) => [...prev, p])}
            onDeleted={(id) => setPoints((prev) => prev.filter((p) => p.id !== id))}
          />
        </div>
      </div>

      {points.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-text">Pontos registrados</h3>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {points.map((p) => (
              <div key={p.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-status-cancelled" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-text-secondary">
                    {p.view === 'front' ? 'Frente' : 'Costas'}
                    {p.region ? ` — ${p.region}` : ''} —{' '}
                  </span>
                  <span className="text-text">{p.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
