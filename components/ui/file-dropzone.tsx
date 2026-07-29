'use client'

import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudArrowUp, faXmark } from '@fortawesome/free-solid-svg-icons'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  /** MIME types / extensions for the underlying input. */
  accept: string
  /** Primary call to action, e.g. "Adjuntar archivo". */
  label: string
  /** Secondary hint, e.g. "PNG, JPG, WEBP o PDF · max 10MB". */
  hint?: string
  multiple?: boolean
  disabled?: boolean
  /** Name of the currently selected file, shown in place of the label. */
  selectedName?: string | null
  onFiles: (files: FileList) => void
  onClear?: () => void
  className?: string
  /** Associates the zone with an external <label>. */
  'aria-labelledby'?: string
  /**
   * Overrides the generated id on the hidden <input>. Pass this when an
   * external <label htmlFor> has to point at the real control — otherwise the
   * label goes unannounced *and* stops opening the picker on click.
   */
  inputId?: string
}

/**
 * Styled upload zone that is a real button: focusable, Enter/Space activated,
 * and drag-and-drop capable. Replaces the <div onClick> + hidden input pattern.
 */
export function FileDropzone({
  accept,
  label,
  hint,
  multiple = false,
  disabled = false,
  selectedName,
  onFiles,
  onClear,
  className,
  'aria-labelledby': ariaLabelledBy,
  inputId,
}: FileDropzoneProps) {
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const resolvedInputId = inputId ?? generatedId
  const [dragging, setDragging] = useState(false)

  const open = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <input
        ref={inputRef}
        id={resolvedInputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files)
          // Reset so picking the same file twice in a row still fires change.
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : t('dropzone.activate')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled && e.dataTransfer.files.length) onFiles(e.dataTransfer.files)
        }}
        className={cn(
          'focus-ring flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          dragging ? 'border-pop-550/50 bg-pop-550/5' : 'border-input hover:border-pop-550/40'
        )}
      >
        {/*
          dragleave bubbles, so without pointer-events-none dragging across the
          icon, the label and the hint would fire it on the button repeatedly
          and strobe the highlight off and on.
        */}
        <FontAwesomeIcon icon={faCloudArrowUp} className="pointer-events-none text-2xl text-muted-foreground/40" />
        <span className="pointer-events-none text-sm text-muted-foreground">{selectedName ?? label}</span>
        {hint && <span className="pointer-events-none text-xs text-muted-foreground/60">{hint}</span>}
      </button>
      {selectedName && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="focus-ring self-start rounded-xl px-1 text-xs font-medium text-destructive hover:underline"
        >
          <FontAwesomeIcon icon={faXmark} className="mr-1 text-xs" />
          {t('dropzone.remove')}
        </button>
      )}
    </div>
  )
}
