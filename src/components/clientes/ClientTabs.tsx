import Link from 'next/link'

export function ClientTabs({ clientId, active }: { clientId: string; active: string }) {
  const tabs = [
    { key: 'ficha', label: 'Ficha', href: `/clientes/${clientId}` },
    { key: 'anamnese', label: 'Anamnese', href: `/clientes/${clientId}/anamnese` },
    { key: 'tratamentos', label: 'Tratamentos', href: `/clientes/${clientId}/tratamentos` },
    { key: 'orcamentos', label: 'Orçamentos', href: `/clientes/${clientId}/orcamentos` },
    { key: 'evolucoes', label: 'Evoluções', href: `/clientes/${clientId}/evolucoes` },
    { key: 'proteses', label: 'Próteses', href: `/clientes/${clientId}/proteses` },
  ]

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
