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

// Versão somente-leitura do odontograma — usada no documento de impressão
// (não tem clique/popover como o OdontogramGrid, que é só pra tela interativa).
export function OdontogramStatic({ records }: { records: { tooth_number: string; status: OdontogramStatus }[] }) {
  const statusByTooth = new Map(records.map((r) => [r.tooth_number, r.status]))
  const hasDeciduousRecords = records.some((r) => Number(r.tooth_number[0]) >= 5)

  function row(teeth: string[], upper: boolean) {
    return (
      <div className="flex justify-center gap-1">
        {teeth.map((tooth) => {
          const status = statusByTooth.get(tooth) ?? 'saudavel'
          const badge = (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] text-text-secondary">
              {tooth}
            </span>
          )
          return (
            <div key={tooth} className="flex flex-col items-center gap-0.5">
              {upper && badge}
              <ToothIcon kind={toothKind(tooth)} upper={upper} color={STATUS_COLOR[status]} />
              {!upper && badge}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border p-4">
        {row(UPPER_TEETH, true)}
        <div className="my-3 border-t border-dashed border-border" />
        {row(LOWER_TEETH, false)}
      </div>

      {hasDeciduousRecords && (
        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-medium text-text-secondary">Dentição decídua (leite)</p>
          {row(UPPER_TEETH_DECIDUOUS, true)}
          <div className="my-3 border-t border-dashed border-border" />
          {row(LOWER_TEETH_DECIDUOUS, false)}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
        {STATUS_OPTIONS.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-border" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  )
}
