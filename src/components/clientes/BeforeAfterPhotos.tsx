'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Photo = { name: string; path: string; url: string }
type Kind = 'antes' | 'depois'

function usePhotoList(tenantId: string, clientId: string, kind: Kind) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const folder = `${tenantId}/${clientId}/antes-depois/${kind}`

  async function reload() {
    const supabase = createClient()
    const { data } = await supabase.storage.from('client-files').list(folder, {
      sortBy: { column: 'created_at', order: 'desc' },
    })
    const files = (data ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder')
    const withUrls = await Promise.all(
      files.map(async (f) => {
        const path = `${folder}/${f.name}`
        const { data: signed } = await supabase.storage.from('client-files').createSignedUrl(path, 3600)
        return { name: f.name, path, url: signed?.signedUrl ?? '' }
      })
    )
    setPhotos(withUrls)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { photos, loading, folder, reload }
}

function PhotoColumn({
  tenantId,
  clientId,
  kind,
  label,
  selected,
  onSelect,
}: {
  tenantId: string
  clientId: string
  kind: Kind
  label: string
  selected: Photo | null
  onSelect: (p: Photo) => void
}) {
  const { photos, loading, folder, reload } = usePhotoList(tenantId, clientId, kind)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    await supabase.storage.from('client-files').upload(`${folder}/${Date.now()}-${safeName}`, file, {
      contentType: file.type,
    })
    setUploading(false)
    await reload()
  }

  async function handleDelete(p: Photo) {
    const supabase = createClient()
    await supabase.storage.from('client-files').remove([p.path])
    await reload()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">{label}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs font-medium text-accent disabled:opacity-40"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Enviando...' : 'Enviar foto'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {loading ? (
          <p className="col-span-3 text-xs text-text-secondary">Carregando...</p>
        ) : photos.length === 0 ? (
          <p className="col-span-3 text-xs text-text-secondary">Nenhuma foto ainda.</p>
        ) : (
          photos.map((p) => (
            <div key={p.path} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(p)}
                className={`block h-20 w-full overflow-hidden rounded-lg border-2 ${
                  selected?.path === p.path ? 'border-accent' : 'border-border'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p)}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100"
                title="Apagar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function BeforeAfterPhotos({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const [selectedBefore, setSelectedBefore] = useState<Photo | null>(null)
  const [selectedAfter, setSelectedAfter] = useState<Photo | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-text">Fotos antes / depois</h2>

      {selectedBefore && selectedAfter && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
          <span className="text-xs font-medium text-text-secondary">Comparação</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedBefore.url} alt="Antes" className="w-full object-cover" />
              <p className="bg-bg py-1 text-center text-xs text-text-secondary">Antes</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedAfter.url} alt="Depois" className="w-full object-cover" />
              <p className="bg-bg py-1 text-center text-xs text-text-secondary">Depois</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <PhotoColumn
          tenantId={tenantId}
          clientId={clientId}
          kind="antes"
          label="Antes"
          selected={selectedBefore}
          onSelect={setSelectedBefore}
        />
        <PhotoColumn
          tenantId={tenantId}
          clientId={clientId}
          kind="depois"
          label="Depois"
          selected={selectedAfter}
          onSelect={setSelectedAfter}
        />
      </div>
      <p className="text-xs text-text-secondary">Clique numa foto de cada lado pra comparar.</p>
    </div>
  )
}
