import Link from 'next/link'
import { CalendarClock, TriangleAlert, UserPlus, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { addDays, startOfDay, startOfWeek, BR_TZ } from '@/lib/date-range'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type UpcomingRow = {
  id: string
  datetime: string
  type: string
  title: string | null
  status: string
  clients: { name: string } | null
  professionals: { name: string } | null
}

export default async function Home() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = addDays(todayStart, 1)
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 7)

  const [{ data: todayAppointments }, { data: weekTransactions }, { count: newClientsCount }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, datetime, type, title, status, clients(name), professionals(name)')
      .gte('datetime', todayStart.toISOString())
      .lt('datetime', todayEnd.toISOString())
      .neq('status', 'cancelled')
      .order('datetime'),
    supabase
      .from('transactions')
      .select('amount, status, due_date')
      .gte('due_date', todayStart.toISOString().slice(0, 10))
      .lt('due_date', weekEnd.toISOString().slice(0, 10)),
    supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
  ])

  const appointmentsToday = (todayAppointments ?? []) as unknown as UpcomingRow[]
  const upcoming = appointmentsToday.filter((a) => new Date(a.datetime) >= now).slice(0, 5)
  const nextTime = upcoming[0]
    ? new Date(upcoming[0].datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BR_TZ })
    : null

  const aReceberSemana = (weekTransactions ?? [])
    .filter((t) => t.status !== 'received')
    .reduce((sum, t) => sum + t.amount, 0)
  const pendencias = (weekTransactions ?? [])
    .filter((t) => t.status === 'overdue')
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{tenant?.name ?? 'NexHub'}</h1>
        <p className="text-text-secondary">Agenda, clientes e financeiro num só lugar.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-7">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <CalendarClock className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Agendamentos hoje</p>
            <p className="text-3xl font-semibold text-text">{appointmentsToday.length}</p>
            {nextTime && <p className="text-xs text-text-secondary">Próximo às {nextTime}</p>}
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-7">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-status-confirmed/10">
            <Wallet className="h-7 w-7 text-status-confirmed" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">A receber esta semana</p>
            <p className="text-3xl font-semibold text-text">{formatBRL(aReceberSemana)}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-7">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-status-cancelled/10">
            <TriangleAlert className="h-7 w-7 text-status-cancelled" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Pendências</p>
            <p className="text-3xl font-semibold text-text">{formatBRL(pendencias)}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-border bg-surface p-7">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft">
            <UserPlus className="h-7 w-7 text-accent" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Novos clientes na semana</p>
            <p className="text-3xl font-semibold text-text">{newClientsCount ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Próximos agendamentos</h2>
          <Link href="/agenda" className="text-sm font-medium text-accent">
            Ver agenda completa
          </Link>
        </div>
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {upcoming.length ? (
            upcoming.map((a) => {
              const label = a.type === 'compromisso' ? (a.title ?? 'Compromisso') : (a.clients?.name ?? 'Cliente')
              const time = new Date(a.datetime).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: BR_TZ,
              })
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="w-14 shrink-0 text-sm font-medium text-text">{time}</span>
                  <span className="min-w-0 flex-1 truncate text-text">{label}</span>
                  <span className="text-sm text-text-secondary">{a.professionals?.name ?? '—'}</span>
                </div>
              )
            })
          ) : (
            <p className="px-4 py-6 text-center text-text-secondary">Nenhum agendamento pendente pra hoje.</p>
          )}
        </div>
      </div>
    </div>
  )
}
