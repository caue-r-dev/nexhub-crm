'use client'

import { useMemo, useRef, useState } from 'react'

type Client = { id: string; name: string; phone?: string | null }

// Todos os clientes já vêm carregados do server (mesmo dataset do <select>
// antigo) — filtro é local, sem round-trip. Se a base crescer muito, trocar
// por busca no servidor sem mudar a interface do componente.
export function ClientCombobox({
  clients,
  value,
  onChange,
  placeholder = 'Busque por nome ou telefone...',
}: {
  clients: Client[]
  value: string
  onChange: (clientId: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = clients.find((c) => c.id === value)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients.slice(0, 20)
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q))
      .slice(0, 20)
  }, [clients, query])

  return (
    <div className="relative" ref={containerRef}>
      <input
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
        placeholder={placeholder}
        value={open ? query : (selected?.name ?? '')}
        onFocus={() => {
          setQuery('')
          setOpen(true)
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          // Delay pra permitir o clique no item da lista registrar antes do blur fechar.
          setTimeout(() => setOpen(false), 150)
        }}
      />

      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-md">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-secondary">Nenhum cliente encontrado.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id)
                  setOpen(false)
                }}
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-bg"
              >
                <span className="text-text">{c.name}</span>
                {c.phone && <span className="text-xs text-text-secondary">{c.phone}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
