import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentAdmin } from '@/lib/admin'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')

  return (
    <div className="flex min-h-screen flex-col" data-palette="petroleo">
      <header className="bg-accent">
        <nav className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/nexhub-icon.png" alt="" width={28} height={28} />
            <span className="font-semibold text-white">Painel Admin</span>
          </Link>
          <span className="ml-auto text-sm text-white/80">{admin.email}</span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
