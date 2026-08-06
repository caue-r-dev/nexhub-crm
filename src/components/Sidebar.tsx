'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Home, LogOut, MessageCircle, PanelLeftClose, PanelLeftOpen, Users, Wallet } from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'

const LINKS = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/atendimento', label: 'Atendimento', icon: MessageCircle },
]

const STORAGE_KEY = 'nexhub_sidebar_collapsed'

// Texto/ícone da sidebar usam --sidebar-text (branco nas 3 paletas atuais,
// declarado por paleta em globals.css — ver comentário lá). Item inativo
// usa opacidade reduzida da mesma cor via color-mix, não um hex separado.
const textMuted = { color: 'color-mix(in srgb, var(--sidebar-text) 70%, transparent)' }
const textFull = { color: 'var(--sidebar-text)' }

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === '1') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-accent transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex h-16 items-center px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {collapsed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/nexhub-icon.png" alt="NexHub" className="h-8 w-8 shrink-0" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/nexhub-wordmark.png" alt="NexHub" className="h-8 w-auto" />
          )}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
              style={{
                ...(active ? textFull : textMuted),
                backgroundColor: active ? 'var(--accent-hover)' : undefined,
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div
        className="flex flex-col gap-1 p-2"
        style={{ borderTop: '1px solid color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}
      >
        <button
          type="button"
          onClick={toggle}
          className={`sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          style={textMuted}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5 shrink-0" /> : <PanelLeftClose className="h-5 w-5 shrink-0" />}
          {!collapsed && <span>Recolher</span>}
        </button>

        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? 'Sair' : undefined}
            className={`sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            style={textMuted}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </form>
      </div>

      <style jsx>{`
        .sidebar-link:hover {
          background-color: color-mix(in srgb, var(--sidebar-text) 8%, transparent);
          color: var(--sidebar-text);
        }
      `}</style>
    </aside>
  )
}
