'use client'

import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'
import { uploadRcLogo } from '@/lib/api/rescue-centers'

interface LogoUploadProps {
  logoUrl: string | null
  onUpdate: (newUrl: string) => void
}

export function LogoUpload({ logoUrl, onUpdate }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentUrl = preview ?? logoUrl

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Imagen inválida. Máx 5MB, PNG/JPG/WEBP.')
      return
    }
    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setUploading(true)

    const { data, error: uploadError } = await uploadRcLogo(file)
    setUploading(false)
    URL.revokeObjectURL(objectUrl)
    setPreview(null)

    if (uploadError) {
      setError(uploadError)
      return
    }
    if (data) onUpdate(data.logo_url)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
      />
      <div
        className="w-full rounded-xl border border-dashed border-input overflow-hidden cursor-pointer hover:border-pop-550/50 transition-colors"
        style={{ aspectRatio: '4/1' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <FontAwesomeIcon icon={faImage} className="text-4xl opacity-20" />
            <span className="text-xs">Click o arrastra · PNG, JPG, WEBP · max 5MB · 1600x400px</span>
          </div>
        )}
      </div>
      {uploading && <p className="text-xs text-muted-foreground">Subiendo...</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
