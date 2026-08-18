'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfessionalPhotoAction } from '@/app/actions/professionals'

export function ProfessionalPhotoUpload({
  professionalId,
  tenantId,
  initialPhotoPath,
  initials,
}: {
  professionalId: string
  tenantId: string
  initialPhotoPath: string | null
  initials: string
}) {
  const [photoPath, setPhotoPath] = useState(initialPhotoPath)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photoPath) {
      setPhotoUrl(null)
      return
    }
    const supabase = createClient()
    supabase.storage
      .from('client-files')
      .createSignedUrl(photoPath, 3600)
      .then(({ data }) => setPhotoUrl(data?.signedUrl ?? null))
  }, [photoPath])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${tenantId}/professionals/${professionalId}/foto-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('client-files').upload(path, file, {
      contentType: file.type,
    })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const oldPath = photoPath
    const result = await updateProfessionalPhotoAction(professionalId, path)
    setUploading(false)

    if (result && 'error' in result) {
      setError(result.error ?? null)
      await supabase.storage.from('client-files').remove([path])
      return
    }

    setPhotoPath(path)
    if (oldPath) await supabase.storage.from('client-files').remove([oldPath])
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-lg font-semibold text-text-secondary disabled:opacity-40"
        title="Trocar foto"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="self-start text-sm font-medium text-accent disabled:opacity-40"
        >
          {uploading ? 'Enviando...' : photoPath ? 'Trocar foto' : '+ Adicionar foto'}
        </button>
        {error && <p className="text-xs text-status-cancelled">{error}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
