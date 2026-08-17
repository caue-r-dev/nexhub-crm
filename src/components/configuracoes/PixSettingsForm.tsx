'use client'

import { useState, useTransition } from 'react'
import { updatePixSettingsAction } from '@/app/actions/pix-settings'

export function PixSettingsForm({
  initialKey,
  initialName,
  initialDefaultDepositAmount,
  personLabelLower,
  bookingWord,
}: {
  initialKey: string
  initialName: string
  initialDefaultDepositAmount: string
  personLabelLower: string
  bookingWord: string
}) {
  const [pixKey, setPixKey] = useState(initialKey)
  const [pixReceiverName, setPixReceiverName] = useState(initialName)
  const [defaultDepositAmount, setDefaultDepositAmount] = useState(initialDefaultDepositAmount)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updatePixSettingsAction({ pixKey, pixReceiverName, defaultDepositAmount })
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
        <span className="text-sm font-medium text-text">Chave Pix</span>
        <input
          placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={pixKey}
          onChange={(e) => {
            setPixKey(e.target.value)
            setSaved(false)
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Nome do recebedor</span>
        <input
          placeholder="Nome que aparece pro pagador"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={pixReceiverName}
          onChange={(e) => {
            setPixReceiverName(e.target.value)
            setSaved(false)
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Valor padrão do sinal (R$)</span>
        <input
          type="number"
          step="0.01"
          placeholder="Ex: 50.00"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={defaultDepositAmount}
          onChange={(e) => {
            setDefaultDepositAmount(e.target.value)
            setSaved(false)
          }}
        />
        <span className="text-xs text-text-secondary">
          Usado quando o {personLabelLower} confirma a {bookingWord} pelo WhatsApp — manda o PIX desse valor
          automático. Vazio = não manda PIX na confirmação automática.
        </span>
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending || !pixKey.trim() || !pixReceiverName.trim()}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
