'use client'

import { useRouter } from 'next/navigation'

type Professional = { id: string; name: string }

export function WeekProfessionalSelect({
  professionals,
  selectedId,
  date,
}: {
  professionals: Professional[]
  selectedId: string
  date: string
}) {
  const router = useRouter()

  return (
    <select
      value={selectedId}
      onChange={(e) => router.push(`/agenda?view=week&date=${date}&pro=${e.target.value}`)}
      className="rounded-md border border-border bg-surface px-2 py-1 text-sm font-medium text-text outline-none focus:border-accent"
    >
      {professionals.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
