import Link from 'next/link'
import { ANAMNESE_EVOLUCOES_NICHES } from '@/lib/niche-features'

export function ClientTabs({
  clientId,
  active,
  nicheSlug,
}: {
  clientId: string
  active: string
  nicheSlug: string | null
}) {
  const isDentist = nicheSlug === 'dentista'
  const hasAnamneseEvolucoes = !!nicheSlug && ANAMNESE_EVOLUCOES_NICHES.has(nicheSlug)

  const tabs = [
    { key: 'ficha', label: 'Ficha', href: `/clientes/${clientId}` },
    hasAnamneseEvolucoes && { key: 'anamnese', label: 'Anamnese', href: `/clientes/${clientId}/anamnese` },
    isDentist && { key: 'tratamentos', label: 'Tratamentos', href: `/clientes/${clientId}/tratamentos` },
    { key: 'orcamentos', label: 'Orçamentos', href: `/clientes/${clientId}/orcamentos` },
    hasAnamneseEvolucoes && { key: 'evolucoes', label: 'Evoluções', href: `/clientes/${clientId}/evolucoes` },
    isDentist && { key: 'proteses', label: 'Próteses', href: `/clientes/${clientId}/proteses` },
  ].filter((t): t is { key: string; label: string; href: string } => !!t)

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-border p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
            active === tab.key ? 'bg-accent text-white' : 'text-text'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
