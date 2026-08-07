import Link from 'next/link'
import { Search, Plus, Users, Phone, Upload, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('clients').select('*').order('name')

  if (q?.trim()) {
    const term = `%${q.trim()}%`
    query = query.or(`name.ilike.${term},phone.ilike.${term},document.ilike.${term}`)
  }

  const { data: clients } = await query

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Clientes</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/clientes/export"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </a>
          <Link
            href="/clientes/importar"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
          </Link>
          <Link
            href="/clientes/novo"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo cliente</span>
          </Link>
        </div>
      </div>

      <form className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, telefone ou documento..."
          className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-text outline-none focus:border-accent"
        />
      </form>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {clients?.length ? (
          clients.map((client) => (
            <Link
              key={client.id}
              href={`/clientes/${client.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-bg"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {initials(client.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{client.name}</p>
                {client.convenio && (
                  <p className="text-xs text-text-secondary">{client.convenio}</p>
                )}
              </div>
              {client.phone && (
                <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </span>
              )}
            </Link>
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-text-secondary">
            <Users className="h-8 w-8 opacity-40" />
            <p>Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
