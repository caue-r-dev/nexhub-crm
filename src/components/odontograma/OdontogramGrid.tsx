'use client'

import { useState, useTransition } from 'react'
import { upsertToothAction } from '@/app/actions/odontogram'
import {
  UPPER_TEETH,
  LOWER_TEETH,
  UPPER_TEETH_DECIDUOUS,
  LOWER_TEETH_DECIDUOUS,
  STATUS_LABEL,
  STATUS_COLOR,
  toothKind,
} from '@/lib/odontogram'
import { ToothIcon } from './ToothIcon'
import type { OdontogramStatus } from '@/lib/supabase/types'

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as OdontogramStatus[]

function StatusPopover({
  status,
  onSelect,
  onClose,
}: {
  status: OdontogramStatus
  onSelect: (s: OdontogramStatus) => void
  onClose: () => void
}) {
  return (
    <div className="absolute top-full left-1/2 z-10 mt-1 w-40 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 shadow-lg">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">Status</span>
        <button onClick={onClose} className="text-xs text-text-secondary">
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-bg ${
              s === status ? 'bg-bg font-medium' : ''
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full border border-border"
              style={{ background: STATUS_COLOR[s] }}
            />
            <span className="text-text">{STATUS_LABEL[s]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Tooth({
  clientId,
  toothNumber,
  status,
  upper,
  isOpen,
  onToggle,
}: {
  clientId: string
  toothNumber: string
  status: OdontogramStatus
  upper: boolean
  isOpen: boolean
  onToggle: () => void
}) {
  const [current, setCurrent] = useState(status)
  const [isPending, startTransition] = useTransition()

  function handleSelect(next: OdontogramStatus) {
    setCurrent(next)
    onToggle()
    startTransition(async () => {
      await upsertToothAction(clientId, toothNumber, next)
    })
  }

  const numberBadge = (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] text-text-secondary">
      {toothNumber}
    </span>
  )

  const content = (
    <button
      onClick={onToggle}
      disabled={isPending}
      title={STATUS_LABEL[current]}
      className="flex flex-col items-center gap-0.5 disabled:opacity-40"
    >
      {upper && numberBadge}
      <ToothIcon kind={toothKind(toothNumber)} upper={upper} color={STATUS_COLOR[current]} />
      {!upper && numberBadge}
    </button>
  )

  return (
    <div className="relative">
      {content}
      {isOpen && <StatusPopover status={current} onSelect={handleSelect} onClose={onToggle} />}
    </div>
  )
}

export function OdontogramGrid({
  clientId,
  records,
}: {
  clientId: string
  records: { tooth_number: string; status: OdontogramStatus }[]
}) {
  const statusByTooth = new Map(records.map((r) => [r.tooth_number, r.status]))
  const [openTooth, setOpenTooth] = useState<string | null>(null)
  const [dentition, setDentition] = useState<'permanente' | 'decidua'>('permanente')
  const upperTeeth = dentition === 'permanente' ? UPPER_TEETH : UPPER_TEETH_DECIDUOUS
  const lowerTeeth = dentition === 'permanente' ? LOWER_TEETH : LOWER_TEETH_DECIDUOUS

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 self-start rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setDentition('permanente')}
          className={`rounded-md px-3 py-1 text-sm ${dentition === 'permanente' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Permanente
        </button>
        <button
          type="button"
          onClick={() => setDentition('decidua')}
          className={`rounded-md px-3 py-1 text-sm ${dentition === 'decidua' ? 'bg-accent text-white' : 'text-text'}`}
        >
          Decídua (leite)
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-1 flex justify-center gap-1">
          {upperTeeth.map((tooth) => (
            <Tooth
              key={tooth}
              clientId={clientId}
              toothNumber={tooth}
              status={statusByTooth.get(tooth) ?? 'saudavel'}
              upper
              isOpen={openTooth === tooth}
              onToggle={() => setOpenTooth((t) => (t === tooth ? null : tooth))}
            />
          ))}
        </div>
        <div className="my-3 border-t border-dashed border-border" />
        <div className="flex justify-center gap-1">
          {lowerTeeth.map((tooth) => (
            <Tooth
              key={tooth}
              clientId={clientId}
              toothNumber={tooth}
              status={statusByTooth.get(tooth) ?? 'saudavel'}
              upper={false}
              isOpen={openTooth === tooth}
              onToggle={() => setOpenTooth((t) => (t === tooth ? null : tooth))}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        {STATUS_OPTIONS.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-border"
              style={{ background: STATUS_COLOR[s] }}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  )
}
