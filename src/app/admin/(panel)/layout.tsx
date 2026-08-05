import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentAdmin } from '@/lib/admin'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="flex min-h-screen flex-col" data-palette="neutro">
      <header className="border-b border-border bg-surface">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-6 py-3">
          <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-text">
            Painel Admin
          </Link>
          <span className="ml-auto text-sm text-text-secondary">{admin.email}</span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
