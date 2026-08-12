'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  previewCampaignAction,
  createCampaignAction,
  listCampaignsAction,
  type CampaignFilterType,
  type CampaignPreviewItem,
  type CampaignSummary,
} from '@/app/actions/campaigns'

const FILTER_LABELS: Record<CampaignFilterType, string> = {
  sem_visita: 'Sem visita há',
  orcamento_aberto: 'Orçamento aberto há',
}

export function CampaignsPanel() {
  const [filterType, setFilterType] = useState<CampaignFilterType>('sem_visita')
  const [days, setDays] = useState('90')
  const [preview, setPreview] = useState<CampaignPreviewItem[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [created, setCreated] = useState<number | null>(null)

  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)

  function reloadCampaigns() {
    listCampaignsAction().then((result) => {
      if ('campaigns' in result) setCampaigns(result.campaigns)
    })
  }

  useEffect(reloadCampaigns, [])

  function handlePreview() {
    setError(null)
    setCreated(null)
    startTransition(async () => {
      const result = await previewCampaignAction(filterType, Number(days))
      if ('error' in result) {
        setError(result.error ?? null)
        setPreview(null)
        return
      }
      setPreview(result.items)
      setSelected(new Set(result.items.map((i) => i.clientId)))
    })
  }

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createCampaignAction({ filterType, days: Number(days), clientIds: [...selected] })
      if ('error' in result) {
        setError(result.error ?? null)
        return
      }
      setCreated(result.count)
      setPreview(null)
      reloadCampaigns()
    })
  }

  function toggleSelected(clientId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">Filtro</span>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as CampaignFilterType)
                setPreview(null)
              }}
            >
              <option value="sem_visita">Sem visita há X dias</option>
              <option value="orcamento_aberto">Orçamento aberto há X dias</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text">{FILTER_LABELS[filterType]} (dias)</span>
            <input
              type="number"
              min={1}
              className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            {isPending ? 'Buscando...' : 'Buscar clientes'}
          </button>
        </div>

        {error && <p className="text-sm text-status-cancelled">{error}</p>}
        {created !== null && <p className="text-sm text-status-confirmed">Campanha criada com {created} destinatário(s). O disparo acontece aos poucos, respeitando o limite de mensagens por hora.</p>}

        {preview && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">{selected.size} de {preview.length} selecionado(s)</p>
            <div className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {preview.length === 0 ? (
                <p className="p-4 text-sm text-text-secondary">Nenhum cliente bate com esse critério.</p>
              ) : (
                preview.map((item) => (
                  <label key={item.clientId} className="flex items-center gap-3 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(item.clientId)}
                      onChange={() => toggleSelected(item.clientId)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{item.name}</p>
                      <p className="truncate text-xs text-text-secondary">{item.phone} — {item.detail}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {preview.length > 0 && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || selected.size === 0}
                className="self-start rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
              >
                {isPending ? 'Criando...' : `Disparar campanha (${selected.size})`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-medium text-text">Campanhas disparadas</h2>
        {!campaigns ? (
          <p className="text-text-secondary">Carregando...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-text-secondary">Nenhuma campanha ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-text">
                    {FILTER_LABELS[c.filterType]} {c.filterDays} dias
                  </p>
                  <p className="text-xs text-text-secondary">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-text-secondary">
                  <span>{c.total} total</span>
                  <span>{c.sent} enviados</span>
                  {c.pending > 0 && <span>{c.pending} na fila</span>}
                  {c.failed > 0 && <span className="text-status-cancelled">{c.failed} falharam</span>}
                  <span>{c.responded} responderam</span>
                  <span className="font-medium text-accent">{c.converted} converteram</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
