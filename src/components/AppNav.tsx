'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/financeiro', label: 'Financeiro' },
  { href: '/atendimento', label: 'Atendimento' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3">
        {LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-secondary hover:bg-bg hover:text-text'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
