import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, Plus, CalendarX2, User, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  addDays,
  startOfDay,
  startOfWeek,
  toDateInputValue,
  dayOfMonthBR,
  weekdayIndexBR,
  BR_TZ,
} from '@/lib/date-range'
import { StatusSelect } from '@/components/agenda/StatusSelect'
import { ProfessionalsBar } from '@/components/agenda/ProfessionalsBar'
import { getCurrentTenant } from '@/lib/tenant'

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-l-status-pending',
  confirmed: 'border-l-status-confirmed',
  cancelled: 'border-l-status-cancelled',
  done: 'border-l-text-secondary',
  no_show: 'border-l-text-secondary',
}

const WEEKDAY_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>
}) {
  const { view: viewParam, date: dateParam } = await searchParams
  const view = viewParam === 'day' ? 'day' : 'week'
  const refDate = dateParam ? new Date(`${dateParam}T03:00:00.000Z`) : new Date()

  const rangeStart = view === 'day' ? startOfDay(refDate) : startOfWeek(refDate)
  const rangeEnd = view === 'day' ? addDays(rangeStart, 1) : addDays(rangeStart, 7)
  const todayStart = startOfDay(new Date())
  const tenant = await getCurrentTenant()

  const supabase = await createClient()
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, clients(name), appointment_labels(name, color)')
    .gte('datetime', rangeStart.toISOString())
    .lt('datetime', rangeEnd.toISOString())
    .order('datetime')

  const prevDate = toDateInputValue(addDays(rangeStart, view === 'day' ? -1 : -7))
  const nextDate = toDateInputValue(addDays(rangeStart, view === 'day' ? 1 : 7))

  const days =
    view === 'week'
      ? Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))
      : [rangeStart]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Agenda</h1>
        <div className="flex gap-2">
          <Link
            href="/configuracoes/horarios"
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text"
          >
            <Clock className="h-4 w-4" />
            Horário de funcionamento
          </Link>
          <Link
            href="/agenda/novo"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Novo agendamento
          </Link>
        </div>
      </div>

      <ProfessionalsBar ownerName={tenant?.name ?? 'Você'} />

      <div className="flex items-center gap-2">
        <Link
          href={`/agenda?view=${view}&date=${prevDate}`}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Link>
        <Link
          href={`/agenda?view=${view}&date=${nextDate}`}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </Link>

        <div className="ml-auto flex gap-1 rounded-lg border border-border p-1">
          <Link
            href={`/agenda?view=week&date=${toDateInputValue(refDate)}`}
            className={`rounded-md px-3 py-1 text-sm ${view === 'week' ? 'bg-accent text-white' : 'text-text'}`}
          >
            Semana
          </Link>
          <Link
            href={`/agenda?view=day&date=${toDateInputValue(refDate)}`}
            className={`rounded-md px-3 py-1 text-sm ${view === 'day' ? 'bg-accent text-white' : 'text-text'}`}
          >
            Dia
          </Link>
        </div>
      </div>

      <div className={`grid gap-4 ${view === 'week' ? 'grid-cols-1 md:grid-cols-7' : 'grid-cols-1'}`}>
        {days.map((day) => {
          const dayAppointments = appointments?.filter(
            (a) => startOfDay(new Date(a.datetime)).getTime() === day.getTime()
          )
          const isToday = day.getTime() === todayStart.getTime()

          return (
            <div key={day.toISOString()} className="flex flex-col gap-2">
              {view === 'week' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-secondary">
                    {WEEKDAY_LABEL[weekdayIndexBR(day)]}
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday ? 'bg-accent text-white' : 'text-text-secondary'
                    }`}
                  >
                    {dayOfMonthBR(day)}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {dayAppointments?.length ? (
                  dayAppointments.map((a) => (
                    <div
                      key={a.id}
                      className={`flex flex-col gap-2 rounded-lg border border-border border-l-4 bg-surface p-3 ${STATUS_BORDER[a.status]}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text">
                          {new Date(a.datetime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: BR_TZ,
                          })}
                        </span>
                        {a.type === 'compromisso' ? (
                          <Wrench className="h-3.5 w-3.5 text-text-secondary" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-text-secondary" />
                        )}
                      </div>
                      <p className="text-sm text-text">
                        {a.type === 'compromisso'
                          ? a.title
                          : (a.clients as { name: string } | null)?.name ?? 'Cliente removido'}
                      </p>
                      {a.appointment_labels && (
                        <span
                          className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ background: (a.appointment_labels as { color: string }).color }}
                        >
                          {(a.appointment_labels as { name: string }).name}
                        </span>
                      )}
                      <StatusSelect id={a.id} status={a.status} />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-text-secondary">
                    <CalendarX2 className="h-5 w-5 opacity-40" />
                    <p className="text-xs">Nada agendado.</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
