import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock as ClockIcon, Plus, QrCode } from 'lucide-react'
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
import { GRID_HEIGHT } from '@/lib/agenda-grid'
import { TimeGutter, GridBackground } from '@/components/agenda/TimeGutter'
import { AppointmentBlock, type BlockAppointment } from '@/components/agenda/AppointmentBlock'
import { ProfessionalChips } from '@/components/agenda/ProfessionalChips'
import { WeekProfessionalSelect } from '@/components/agenda/WeekProfessionalSelect'
import { initials } from '@/lib/professional-colors'

const WEEKDAY_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const STATUS_LEGEND = [
  { label: 'Pendente', color: 'var(--status-pending)' },
  { label: 'Confirmado', color: 'var(--status-confirmed)' },
  { label: 'Cancelado', color: 'var(--status-cancelled)' },
]

type Row = {
  id: string
  datetime: string
  duration_min: number
  status: BlockAppointment['status']
  type: string
  title: string | null
  professional_id: string | null
  clients: { name: string } | null
}

function toBlock(row: Row): BlockAppointment {
  const label = row.type === 'compromisso' ? (row.title ?? 'Compromisso') : (row.clients?.name ?? 'Cliente removido')
  const timeLabel = new Date(row.datetime).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BR_TZ,
  })
  return { id: row.id, datetime: row.datetime, duration_min: row.duration_min, status: row.status, label, timeLabel }
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; hide?: string; pro?: string }>
}) {
  const { view: viewParam, date: dateParam, hide, pro } = await searchParams
  const view = viewParam === 'week' ? 'week' : 'day'
  const refDate = dateParam ? new Date(`${dateParam}T03:00:00.000Z`) : new Date()
  const hiddenIds = hide ? hide.split(',').filter(Boolean) : []

  const rangeStart = view === 'day' ? startOfDay(refDate) : startOfWeek(refDate)
  const rangeEnd = view === 'day' ? addDays(rangeStart, 1) : addDays(rangeStart, 7)

  const supabase = await createClient()

  const { data: professionals } = await supabase
    .from('professionals')
    .select('id, name, color')
    .eq('active', true)
    .order('created_at')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, datetime, duration_min, status, type, title, professional_id, clients(name)')
    .gte('datetime', rangeStart.toISOString())
    .lt('datetime', rangeEnd.toISOString())
    .order('datetime')

  const rows = (appointments ?? []) as unknown as Row[]

  const prevDate = toDateInputValue(addDays(rangeStart, view === 'day' ? -1 : -7))
  const nextDate = toDateInputValue(addDays(rangeStart, view === 'day' ? 1 : 7))
  const todayValue = toDateInputValue(refDate)

  const dayLabel = refDate.toLocaleDateString('pt-BR', { timeZone: BR_TZ, weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">Agenda</h1>
          <p className="text-xs text-text-secondary capitalize sm:text-sm">{dayLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/agenda?view=${view}&date=${prevDate}`} className="rounded-lg border border-border bg-surface p-2 text-text">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href={`/agenda?view=${view}&date=${nextDate}`} className="rounded-lg border border-border bg-surface p-2 text-text">
            <ChevronRight className="h-4 w-4" />
          </Link>

          <div className="ml-1 flex overflow-hidden rounded-lg border border-border">
            <Link
              href={`/agenda?view=day&date=${todayValue}`}
              className={`px-3 py-2 text-xs font-medium sm:text-sm ${view === 'day' ? 'bg-accent text-white' : 'bg-surface text-text'}`}
            >
              Dia
            </Link>
            <Link
              href={`/agenda?view=week&date=${todayValue}`}
              className={`px-3 py-2 text-xs font-medium sm:text-sm ${view === 'week' ? 'bg-accent text-white' : 'bg-surface text-text'}`}
            >
              Semana
            </Link>
          </div>

          <Link
            href="/configuracoes/horarios"
            className="ml-1 flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <ClockIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Horário</span>
          </Link>
          <Link
            href="/configuracoes/pix"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Pix</span>
          </Link>
          <Link
            href="/agenda/novo"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo agendamento</span>
          </Link>
        </div>
      </div>

      {view === 'day' && professionals && professionals.length > 0 && (
        <ProfessionalChips professionals={professionals} hiddenIds={hiddenIds} view={view} date={todayValue} />
      )}

      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
        {STATUS_LEGEND.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {view === 'day' ? (
          <DayGrid professionals={professionals ?? []} hiddenIds={hiddenIds} rows={rows} />
        ) : (
          <WeekGrid professionals={professionals ?? []} selectedId={pro} rows={rows} rangeStart={rangeStart} date={todayValue} />
        )}
      </div>
    </div>
  )
}

function DayGrid({
  professionals,
  hiddenIds,
  rows,
}: {
  professionals: { id: string; name: string; color: string }[]
  hiddenIds: string[]
  rows: Row[]
}) {
  const visible = professionals.filter((p) => !hiddenIds.includes(p.id))
  const unassigned = rows.filter((r) => !r.professional_id)

  if (visible.length === 0 && unassigned.length === 0 && professionals.length > 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-text-secondary">
        Selecione ao menos um profissional pra ver a agenda.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max">
        <TimeGutter />
        <div className="flex">
          {visible.map((p) => (
            <div key={p.id} className="flex w-36 flex-col border-l border-border sm:w-44">
              <div className="sticky top-0 flex h-11 items-center gap-1.5 border-b border-border bg-surface px-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {initials(p.name)}
                </span>
                <span className="truncate text-xs font-medium text-text">{p.name}</span>
              </div>
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                <GridBackground />
                {rows
                  .filter((r) => r.professional_id === p.id)
                  .map((r) => (
                    <AppointmentBlock key={r.id} appt={toBlock(r)} tz={BR_TZ} />
                  ))}
              </div>
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="flex w-36 flex-col border-l border-border sm:w-44">
              <div className="sticky top-0 flex h-11 items-center gap-1.5 border-b border-border bg-surface px-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-secondary text-[10px] font-semibold text-white">
                  ?
                </span>
                <span className="truncate text-xs font-medium text-text">Sem profissional</span>
              </div>
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                <GridBackground />
                {unassigned.map((r) => (
                  <AppointmentBlock key={r.id} appt={toBlock(r)} tz={BR_TZ} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WeekGrid({
  professionals,
  selectedId,
  rows,
  rangeStart,
  date,
}: {
  professionals: { id: string; name: string; color: string }[]
  selectedId: string | undefined
  rows: Row[]
  rangeStart: Date
  date: string
}) {
  if (professionals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-sm text-text-secondary">
        <p>Cadastre um profissional pra ver a agenda semanal.</p>
        <Link href="/agenda/profissionais/novo" className="font-medium text-accent">
          + Adicionar profissional
        </Link>
      </div>
    )
  }

  const activeId = selectedId && professionals.some((p) => p.id === selectedId) ? selectedId : professionals[0].id
  const days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs text-text-secondary">Ver agenda de:</span>
        <WeekProfessionalSelect professionals={professionals} selectedId={activeId} date={date} />
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max">
          <TimeGutter />
          <div className="flex">
            {days.map((day) => (
              <div key={day.toISOString()} className="flex w-32 flex-col border-l border-border sm:w-40">
                <div className="flex h-11 flex-col items-center justify-center border-b border-border">
                  <span className="text-[10px] text-text-secondary">{WEEKDAY_LABEL[weekdayIndexBR(day)]}</span>
                  <span className="text-xs font-semibold text-text">{dayOfMonthBR(day)}</span>
                </div>
                <div className="relative" style={{ height: GRID_HEIGHT }}>
                  <GridBackground />
                  {rows
                    .filter((r) => r.professional_id === activeId && startOfDay(new Date(r.datetime)).getTime() === day.getTime())
                    .map((r) => (
                      <AppointmentBlock key={r.id} appt={toBlock(r)} tz={BR_TZ} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
