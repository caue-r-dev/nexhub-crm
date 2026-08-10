'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Doc = { name: string; path: string; createdAt: string | null; sizeKb: number }

export function ClientDocuments({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const folder = `${tenantId}/${clientId}/documentos`

  async function reload() {
    const supabase = createClient()
    const { data, error: listError } = await supabase.storage.from('client-files').list(folder, {
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (listError) {
      setError(listError.message)
    } else {
      setDocs(
        (data ?? [])
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((f) => ({
            name: f.name,
            path: `${folder}/${f.name}`,
            createdAt: f.created_at,
            sizeKb: Math.round((f.metadata?.size ?? 0) / 1024),
          }))
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setUploading(true)
    const supabase = createClient()
    const safeName = file.name.replace(/[^\w.\-]/g, '_')
    const path = `${folder}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from('client-files').upload(path, file, {
      contentType: file.type,
    })
    setUploading(false)

    if (uploadError) {
      setError(uploadError.message)
      return
    }
    await reload()
  }

  async function handleDownload(doc: Doc) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('client-files').createSignedUrl(doc.path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function handleDelete(doc: Doc) {
    startTransition(async () => {
      const supabase = createClient()
      await supabase.storage.from('client-files').remove([doc.path])
      await reload()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Documentos</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-medium text-accent disabled:opacity-40"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Enviando...' : '+ Anexar documento'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      </div>

      {error && <p className="text-sm text-status-cancelled">{error}</p>}

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {loading ? (
          <p className="px-4 py-6 text-center text-text-secondary">Carregando...</p>
        ) : docs.length === 0 ? (
          <p className="px-4 py-6 text-center text-text-secondary">Nenhum documento ainda.</p>
        ) : (
          docs.map((doc) => (
            <div key={doc.path} className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-text-secondary" />
              <button
                type="button"
                onClick={() => handleDownload(doc)}
                className="min-w-0 flex-1 truncate text-left text-sm text-text hover:underline"
              >
                {doc.name.replace(/^\d+-/, '')}
              </button>
              <span className="shrink-0 text-xs text-text-secondary">{doc.sizeKb} KB</span>
              <button
                type="button"
                onClick={() => handleDelete(doc)}
                disabled={isPending}
                className="shrink-0 text-status-cancelled disabled:opacity-40"
                title="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
