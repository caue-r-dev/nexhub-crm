import { getCurrentTenant } from '@/lib/tenant'

export default async function Home() {
  const tenant = await getCurrentTenant()

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-text">{tenant?.name ?? 'NexHub'}</h1>
      <p className="text-text-secondary">Agenda, clientes e financeiro num só lugar.</p>
    </div>
  )
}
