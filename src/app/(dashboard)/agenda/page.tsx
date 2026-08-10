import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock as ClockIcon, QrCode, Link2, ListChecks, ClipboardList, Building2, Star } from 'lucide-react'
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
import type { BlockAppointment } from '@/components/agenda/AppointmentBlock'
import { AgendaSlotColumn } from '@/components/agenda/AgendaSlotColumn'
import { ProfessionalChips } from '@/components/agenda/ProfessionalChips'
import { WeekProfessionalSelect } from '@/components/agenda/WeekProfessionalSelect'
import { TimeGutter } from '@/components/agenda/TimeGutter'
import { AgendaModalProvider } from '@/components/agenda/AgendaModalContext'
import { NewAppointmentButton } from '@/components/agenda/NewAppointmentButton'
import { AppointmentModalHost } from '@/components/agenda/AppointmentModalHost'
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

  // Dados pro modal de novo agendamento (clique direto na agenda) — mesmo
  // dataset que /agenda/novo já carregava, só que aqui alimenta o modal.
  const [{ data: modalClients }, { data: modalLabels }, { data: modalPackages }, { data: professionalHours }] =
    await Promise.all([
      supabase.from('clients').select('id, name, phone').order('name'),
      supabase.from('appointment_labels').select('id, name, color').order('name'),
      supabase
        .from('packages')
        .select('id, client_id, service_name, used_sessions, total_sessions')
        .order('purchased_at', { ascending: false }),
      supabase.from('professional_hours').select('professional_id, weekday, start_time, end_time'),
    ])

  const prevDate = toDateInputValue(addDays(rangeStart, view === 'day' ? -1 : -7))
  const nextDate = toDateInputValue(addDays(rangeStart, view === 'day' ? 1 : 7))
  const todayValue = toDateInputValue(refDate)

  const dayLabel = refDate.toLocaleDateString('pt-BR', { timeZone: BR_TZ, weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <AgendaModalProvider>
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
            href="/configuracoes/procedimentos"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Procedimentos</span>
          </Link>
          <Link
            href="/configuracoes/agendamento-publico"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Agendamento público</span>
          </Link>
          <Link
            href="/configuracoes/servicos"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Serviços</span>
          </Link>
          <Link
            href="/configuracoes/clinica"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Dados da clínica</span>
          </Link>
          <Link
            href="/configuracoes/satisfacao"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text sm:text-sm"
          >
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Satisfação</span>
          </Link>
          <NewAppointmentButton />
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
          <DayGrid professionals={professionals ?? []} hiddenIds={hiddenIds} rows={rows} date={todayValue} />
        ) : (
          <WeekGrid professionals={professionals ?? []} selectedId={pro} rows={rows} rangeStart={rangeStart} date={todayValue} />
        )}
      </div>

      <AppointmentModalHost
        clients={modalClients ?? []}
        labels={modalLabels ?? []}
        professionals={(professionals ?? []).map((p) => ({ id: p.id, name: p.name }))}
        packages={modalPackages ?? []}
        professionalHours={professionalHours ?? []}
        existingAppointments={rows.map((r) => ({ professional_id: r.professional_id, datetime: r.datetime, duration_min: r.duration_min }))}
      />
    </div>
    </AgendaModalProvider>
  )
}

function DayGrid({
  professionals,
  hiddenIds,
  rows,
  date,
}: {
  professionals: { id: string; name: string; color: string }[]
  hiddenIds: string[]
  rows: Row[]
  date: string
}) {
  const visible = professionals.filter((p) => !hiddenIds.includes(p.id))
  const unassigned = rows.filter((r) => !r.professional_id)

  if (professionals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-sm text-text-secondary">
        <p>Cadastre um profissional pra ver a agenda.</p>
        <Link href="/agenda/profissionais/novo" className="font-medium text-accent">
          + Adicionar profissional
        </Link>
      </div>
    )
  }

  if (visible.length === 0 && unassigned.length === 0 && professionals.length > 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-text-secondary">
        Selecione ao menos um profissional pra ver a agenda.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex w-full">
        <TimeGutter />
        <div className="flex flex-1">
          {visible.map((p) => (
            <div key={p.id} className="flex min-w-[144px] flex-1 flex-col border-l border-border sm:min-w-[176px]">
              <div className="sticky top-0 flex h-11 items-center gap-1.5 border-b border-border bg-surface px-2">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {initials(p.name)}
                </span>
                <span className="truncate text-xs font-medium text-text">{p.name}</span>
              </div>
              <AgendaSlotColumn
                professionalId={p.id}
                date={date}
                tz={BR_TZ}
                blocks={rows.filter((r) => r.professional_id === p.id).map(toBlock)}
              />
            </div>
          ))}

          {unassigned.length > 0 && (
            <div className="flex min-w-[144px] flex-1 flex-col border-l border-border sm:min-w-[176px]">
              <div className="sticky top-0 flex h-11 items-center gap-1.5 border-b border-border bg-surface px-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-secondary text-[10px] font-semibold text-white">
                  ?
                </span>
                <span className="truncate text-xs font-medium text-text">Sem profissional</span>
              </div>
              <AgendaSlotColumn professionalId={null} date={date} tz={BR_TZ} blocks={unassigned.map(toBlock)} />
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
        <div className="flex w-full">
          <TimeGutter />
          <div className="flex flex-1">
            {days.map((day) => (
              <div key={day.toISOString()} className="flex min-w-[128px] flex-1 flex-col border-l border-border sm:min-w-[160px]">
                <div className="flex h-11 flex-col items-center justify-center border-b border-border">
                  <span className="text-[10px] text-text-secondary">{WEEKDAY_LABEL[weekdayIndexBR(day)]}</span>
                  <span className="text-xs font-semibold text-text">{dayOfMonthBR(day)}</span>
                </div>
                <AgendaSlotColumn
                  professionalId={activeId}
                  date={toDateInputValue(day)}
                  tz={BR_TZ}
                  blocks={rows
                    .filter((r) => r.professional_id === activeId && startOfDay(new Date(r.datetime)).getTime() === day.getTime())
                    .map(toBlock)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
