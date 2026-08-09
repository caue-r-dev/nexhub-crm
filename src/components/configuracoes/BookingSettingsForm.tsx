'use client'

import { useState, useTransition } from 'react'
import { updateBookingSettingsAction } from '@/app/actions/booking-settings'

export function BookingSettingsForm({
  initial,
}: {
  initial: {
    slug: string
    notificationPhone: string
    slotDurationMinutes: number
    bufferMinutes: number
    bookingHoldMinutes: number
  }
}) {
  const [slug, setSlug] = useState(initial.slug)
  const [notificationPhone, setNotificationPhone] = useState(initial.notificationPhone)
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(String(initial.slotDurationMinutes))
  const [bufferMinutes, setBufferMinutes] = useState(String(initial.bufferMinutes))
  const [bookingHoldMinutes, setBookingHoldMinutes] = useState(String(initial.bookingHoldMinutes))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateBookingSettingsAction({
        slug,
        notificationPhone,
        slotDurationMinutes: Number(slotDurationMinutes),
        bufferMinutes: Number(bufferMinutes),
        bookingHoldMinutes: Number(bookingHoldMinutes),
      })
      if (result && 'error' in result) {
        setError(result.error ?? null)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Link público (slug)</span>
        <div className="flex items-center gap-1 text-sm text-text-secondary">
          <span>nexhub.com.br/agendar/</span>
          <input
            className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="minha-clinica"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">WhatsApp para notificação de novo agendamento</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={notificationPhone}
          onChange={(e) => setNotificationPhone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Duração do slot (minutos)</span>
        <input
          type="number"
          min={5}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={slotDurationMinutes}
          onChange={(e) => setSlotDurationMinutes(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Intervalo mínimo entre consultas (minutos)</span>
        <input
          type="number"
          min={0}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={bufferMinutes}
          onChange={(e) => setBufferMinutes(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Tempo pro paciente pagar o sinal antes de expirar (minutos)</span>
        <input
          type="number"
          min={10}
          className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={bookingHoldMinutes}
          onChange={(e) => setBookingHoldMinutes(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending || !slug.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
