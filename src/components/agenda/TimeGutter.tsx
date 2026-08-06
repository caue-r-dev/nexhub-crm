import { DAY_START, DAY_END, ROW_H } from '@/lib/agenda-grid'

export function TimeGutter() {
  const hours = []
  for (let h = DAY_START; h < DAY_END; h++) hours.push(h)

  return (
    <div className="flex w-12 shrink-0 flex-col sm:w-14">
      <div style={{ height: 44 }} />
      {hours.map((h) => (
        <div
          key={h}
          className="-translate-y-2 pr-2 text-right text-[11px] text-text-secondary"
          style={{ height: ROW_H * 2 }}
        >
          {String(h).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  )
}

export function GridBackground() {
  const rows = Array.from({ length: ((DAY_END - DAY_START) * 60) / 30 })
  return (
    <div className="absolute inset-0">
      {rows.map((_, i) => (
        <div key={i} className="border-t border-border" style={{ height: ROW_H }} />
      ))}
    </div>
  )
}
