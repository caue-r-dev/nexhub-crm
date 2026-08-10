'use client'

import { GridBackground } from './TimeGutter'
import { AppointmentBlock, type BlockAppointment } from './AppointmentBlock'
import { GRID_HEIGHT, DAY_START, ROW_H, SLOT_MIN } from '@/lib/agenda-grid'
import { useAgendaModal } from './AgendaModalContext'

// Clicar em espaço vazio da coluna abre o modal de novo agendamento já com
// data/hora (calculada pela posição Y do clique) e profissional da coluna
// preenchidos — igual ao clique direto na agenda do Codental. Clique em cima
// de um agendamento existente não propaga até aqui (AppointmentBlock para a
// propagação), então não conflita com o popover de status/apagar.
export function AgendaSlotColumn({
  professionalId,
  date,
  blocks,
  tz,
}: {
  professionalId: string | null
  date: string
  blocks: BlockAppointment[]
  tz: string
}) {
  const { openModal } = useAgendaModal()

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const slotIndex = Math.max(0, Math.floor(y / ROW_H))
    const totalMin = DAY_START * 60 + slotIndex * SLOT_MIN
    const hours = Math.floor(totalMin / 60)
    const minutes = totalMin % 60
    const [year, month, day] = date.split('-').map(Number)
    const dt = new Date(year, month - 1, day, hours, minutes)
    openModal({ datetime: dt, professionalId: professionalId ?? undefined })
  }

  return (
    <div className="relative cursor-pointer" style={{ height: GRID_HEIGHT }} onClick={handleClick}>
      <GridBackground />
      {blocks.map((b) => (
        <AppointmentBlock key={b.id} appt={b} tz={tz} />
      ))}
    </div>
  )
}
