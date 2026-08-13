'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Calendar,
  ChevronDown,
  Clock as ClockIcon,
  ClipboardList,
  Home,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  PawPrint,
  QrCode,
  Scale,
  Settings,
  Star,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'
import { SubscriptionRenewModal } from '@/components/SubscriptionRenewModal'
import type { SubscriptionStatus } from '@/lib/supabase/types'
import { ESTOQUE_NICHES, PROCESSOS_NICHES } from '@/lib/niche-features'

const VETERINARIO_NICHES = new Set(['veterinario'])

const LINKS = [
  { href: '/painel', label: 'Início', icon: Home },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/animais', label: 'Animais', icon: PawPrint, nicheGate: VETERINARIO_NICHES },
  { href: '/prazos', label: 'Prazos', icon: Scale, nicheGate: PROCESSOS_NICHES },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/estoque', label: 'Estoque', icon: Package, nicheGate: ESTOQUE_NICHES },
  { href: '/atendimento', label: 'Atendimento', icon: MessageCircle },
]

const SETTINGS_LINKS = [
  { href: '/configuracoes/clinica', label: 'Dados da clínica', icon: Building2 },
  { href: '/configuracoes/horarios', label: 'Horário', icon: ClockIcon },
  { href: '/configuracoes/pix', label: 'Pix', icon: QrCode },
  { href: '/configuracoes/procedimentos', label: 'Procedimentos', icon: ListChecks },
  { href: '/configuracoes/agendamento-publico', label: 'Agendamento público', icon: Link2 },
  { href: '/configuracoes/servicos', label: 'Serviços', icon: ClipboardList },
  { href: '/configuracoes/satisfacao', label: 'Satisfação', icon: Star },
]

const STORAGE_KEY = 'nexhub_sidebar_collapsed'

// Texto/ícone da sidebar usam --sidebar-text (branco nas 3 paletas atuais,
// declarado por paleta em globals.css — ver comentário lá). Item inativo
// usa opacidade reduzida da mesma cor via color-mix, não um hex separado.
const textMuted = { color: 'color-mix(in srgb, var(--sidebar-text) 70%, transparent)' }
const textFull = { color: 'var(--sidebar-text)' }

export function Sidebar({
  subscription,
  nicheSlug,
}: {
  subscription: { status: SubscriptionStatus; daysLeft: number | null }
  nicheSlug: string | null
}) {
  const pathname = usePathname()
  const visibleLinks = LINKS.filter((link) => !link.nicheGate || (nicheSlug && link.nicheGate.has(nicheSlug)))
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const settingsActive = pathname.startsWith('/configuracoes')
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === '1') setCollapsed(true)
  }, [])

  // Troca de página fecha a gaveta mobile sozinha — sem isso, o menu ficava
  // aberto por cima da tela nova até o usuário fechar manualmente.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <>
      {/* Barra fixa só em mobile — a sidebar de verdade fica fora da tela até
          abrir. Sem isso não tinha jeito nenhum de navegar no celular. */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-accent px-3 md:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" style={textFull}>
          <Menu className="h-6 w-6" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/nexhub-wordmark.png" alt="NexHub" className="h-6 w-auto" />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-accent transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 md:transition-[width] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        <div className="flex h-16 items-center justify-between px-3">
          <Link href="/painel" className="flex min-w-0 items-center gap-2">
            {collapsed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brand/nexhub-icon.png" alt="NexHub" className="hidden h-8 w-8 shrink-0 md:block" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brand/nexhub-wordmark.png" alt="NexHub" className="h-8 w-auto md:h-8" />
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="md:hidden"
            style={textFull}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="sidebar-nav flex flex-1 flex-col gap-1 overflow-y-auto px-2">
          {visibleLinks.map((link) => {
            const active = link.href === '/painel' ? pathname === '/painel' : pathname.startsWith(link.href)
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? 'md:justify-center' : ''
                }`}
                style={{
                  ...(active ? textFull : textMuted),
                  backgroundColor: active ? 'var(--accent-hover)' : undefined,
                }}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{link.label}</span>
              </Link>
            )
          })}

          <div className={collapsed ? 'md:hidden' : undefined}>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="sidebar-link flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={settingsActive ? textFull : textMuted}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span className="flex-1 truncate text-left">Configurações</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>
            {settingsOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l pl-3" style={{ borderColor: 'color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}>
                {SETTINGS_LINKS.map((link) => {
                  const active = pathname.startsWith(link.href)
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="sidebar-link flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
                      style={{
                        ...(active ? textFull : textMuted),
                        backgroundColor: active ? 'var(--accent-hover)' : undefined,
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        <div className={`mx-2 mb-2 shrink-0 rounded-lg px-3 py-2 text-xs ${collapsed ? 'md:hidden' : ''}`} style={textMuted}>
          {subscription.status === 'trial' && (
            <span>
              {subscription.daysLeft !== null
                ? `Teste expira em ${Math.max(subscription.daysLeft, 0)}d`
                : 'Período de teste'}
            </span>
          )}

          {subscription.status === 'active' && (
            <>
              <span>
                {subscription.daysLeft !== null
                  ? `Vence em ${Math.max(subscription.daysLeft, 0)}d`
                  : 'Assinatura ativa'}
              </span>
              <button
                type="button"
                onClick={() => setShowRenewModal(true)}
                className="mt-1 block font-semibold underline"
                style={textFull}
              >
                Renovar
              </button>
            </>
          )}

          {subscription.status === 'overdue' && (
            <>
              <span>
                {subscription.daysLeft !== null && subscription.daysLeft < 0
                  ? `Vencido há ${Math.abs(subscription.daysLeft)}d`
                  : 'Assinatura vencida'}
              </span>
              <button
                type="button"
                onClick={() => setShowRenewModal(true)}
                className="mt-1 block font-semibold underline"
                style={textFull}
              >
                Renovar
              </button>
            </>
          )}

          {subscription.status === 'cancelled' && <span>Assinatura cancelada</span>}
        </div>

        <div
          className="flex shrink-0 flex-col gap-1 p-2"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}
        >
          <button
            type="button"
            onClick={toggle}
            className={`sidebar-link hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:flex ${
              collapsed ? 'md:justify-center' : ''
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
                collapsed ? 'md:justify-center' : ''
              }`}
              style={textMuted}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className={collapsed ? 'md:hidden' : ''}>Sair</span>
            </button>
          </form>
        </div>

        <style jsx>{`
          .sidebar-link:hover {
            background-color: color-mix(in srgb, var(--sidebar-text) 8%, transparent);
            color: var(--sidebar-text);
          }
          .sidebar-nav {
            scrollbar-width: thin;
            scrollbar-color: color-mix(in srgb, var(--sidebar-text) 25%, transparent) transparent;
          }
          .sidebar-nav::-webkit-scrollbar {
            width: 6px;
          }
          .sidebar-nav::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-nav::-webkit-scrollbar-thumb {
            background-color: color-mix(in srgb, var(--sidebar-text) 25%, transparent);
            border-radius: 999px;
          }
        `}</style>

        {showRenewModal && <SubscriptionRenewModal onClose={() => setShowRenewModal(false)} />}
      </aside>
    </>
  )
}
