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
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-brand-sidebar transition-[width] duration-200 ${
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              style={
                active
                  ? {
                      backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)',
                      borderLeft: '3px solid var(--accent)',
                      marginLeft: '-3px',
                    }
                  : undefined
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-white/10 p-2">
        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? 'Sair' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </form>

        <button
          type="button"
          onClick={toggle}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5 shrink-0" /> : <PanelLeftClose className="h-5 w-5 shrink-0" />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
