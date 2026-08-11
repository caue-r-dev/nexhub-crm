'use client'

import { useState, useTransition } from 'react'
import { updateClinicProfileAction } from '@/app/actions/tenant-profile'

export function ClinicProfileForm({
  initialPhone,
  initialEmail,
  initialAddress,
  initialCnpj,
  initialSocialMedia,
  initialWebsiteUrl,
}: {
  initialPhone: string
  initialEmail: string
  initialAddress: string
  initialCnpj: string
  initialSocialMedia: string
  initialWebsiteUrl: string
}) {
  const [phone, setPhone] = useState(initialPhone)
  const [email, setEmail] = useState(initialEmail)
  const [address, setAddress] = useState(initialAddress)
  const [cnpj, setCnpj] = useState(initialCnpj)
  const [socialMedia, setSocialMedia] = useState(initialSocialMedia)
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateClinicProfileAction({ phone, email, address, cnpj, socialMedia, websiteUrl })
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
        <span className="text-sm font-medium text-text">Telefone</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            setSaved(false)
          }}
          placeholder="(11) 99999-9999"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">E-mail</span>
        <input
          type="email"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setSaved(false)
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Endereço</span>
        <textarea
          rows={2}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            setSaved(false)
          }}
          placeholder="Rua, número, sala, bairro, cidade - UF, CEP"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">CNPJ</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={cnpj}
          onChange={(e) => {
            setCnpj(e.target.value)
            setSaved(false)
          }}
          placeholder="00.000.000/0001-00"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Redes sociais</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={socialMedia}
          onChange={(e) => {
            setSocialMedia(e.target.value)
            setSaved(false)
          }}
          placeholder="@clinicateste (opcional)"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Site da clínica</span>
        <input
          className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          value={websiteUrl}
          onChange={(e) => {
            setWebsiteUrl(e.target.value)
            setSaved(false)
          }}
          placeholder="https://minhaclinica.com.br (opcional)"
        />
        <span className="text-xs text-text-secondary">
          Se preenchido, o botão &quot;Site da clínica&quot; na agenda abre esse link direto.
        </span>
      </label>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}
      {saved && !isPending && <p className="text-sm text-status-confirmed">Salvo.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
      >
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
