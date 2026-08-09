// Aviso pro WhatsApp da clínica quando um paciente agenda pelo link público.
// Separado de appointment-automation.ts porque é específico do fluxo de
// booking público — as funções de lá (confirmAppointment/cancelAppointment)
// falam com o paciente, essa fala com a clínica.
import { sendWhatsAppText, type EvolutionConfig } from '@/lib/evolution'

export async function notifyTenantOfBooking(
  config: EvolutionConfig,
  notificationPhone: string,
  details: { clientName: string; procedureName: string; professionalName: string; datetime: string }
): Promise<void> {
  const date = new Date(details.datetime)
  const dateLabel = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const timeLabel = date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

  const message = `Novo agendamento pelo link público!\n${details.clientName} — ${details.procedureName}\nCom ${details.professionalName} em ${dateLabel} às ${timeLabel}.`

  await sendWhatsAppText(config, notificationPhone, message)
}
