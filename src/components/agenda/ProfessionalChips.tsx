import Link from 'next/link'
import { Plus } from 'lucide-react'
import { initials } from '@/lib/professional-colors'

type Professional = { id: string; name: string; color: string }

export function ProfessionalChips({
  professionals,
  hiddenIds,
  view,
  date,
}: {
  professionals: Professional[]
  hiddenIds: string[]
  view: string
  date: string
}) {
  function hrefToggle(id: string) {
    const next = hiddenIds.includes(id)
      ? hiddenIds.filter((h) => h !== id)
      : [...hiddenIds, id]
    const qs = next.length ? `&hide=${next.join(',')}` : ''
    return `/agenda?view=${view}&date=${date}${qs}`
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {professionals.map((p) => {
        const active = !hiddenIds.includes(p.id)
        return (
          <Link
            key={p.id}
            href={hrefToggle(p.id)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium"
            style={{
              borderColor: active ? p.color : 'var(--border)',
              backgroundColor: active ? `${p.color}1a` : 'var(--surface)',
              opacity: active ? 1 : 0.5,
            }}
          >
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: p.color }}
            >
              {initials(p.name)}
            </span>
            {p.name}
          </Link>
        )
      })}

      <Link
        href="/agenda/profissionais/novo"
        className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar profissional
      </Link>
    </div>
  )
}
