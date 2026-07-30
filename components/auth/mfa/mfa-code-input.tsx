'use client'

import { useState, useRef, useEffect, useId, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface MfaCodeInputProps {
  onComplete: (code: string) => void
  disabled?: boolean
  error?: string | null
}

export function MfaCodeInput({ onComplete, disabled, error }: MfaCodeInputProps) {
  const { t } = useTranslation('auth')
  // The component can mount more than once on a page, so the ids that wire up
  // the group label and the error message have to be unique per instance.
  const uid = useId()
  const groupLabelId = `${uid}-label`
  const errorId = `${uid}-error`
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (error) {
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    }
  }, [error])

  const commit = (next: string[]) => {
    setDigits(next)
    if (next.every(Boolean)) onComplete(next.join(''))
  }

  /** Spread a whole code across the boxes, whichever box it arrived in. */
  const fill = (raw: string) => {
    const code = raw.replace(/\D/g, '').slice(0, 6)
    if (code.length === 0) return
    const next = Array(6).fill('')
    code.split('').forEach((d, i) => { next[i] = d })
    if (code.length < 6) inputRefs.current[code.length]?.focus()
    commit(next)
  }

  const handleChange = (index: number, value: string) => {
    const entered = value.replace(/\D/g, '')
    // maxLength={1} blocks a second keystroke, so anything longer than one digit
    // came from the OS one-time-code autofill dropping the whole code into a
    // single box. Spread it instead of keeping the last digit and losing the rest.
    if (entered.length > 1) {
      fill(entered)
      return
    }
    const next = [...digits]
    next[index] = entered
    if (entered && index < 5) inputRefs.current[index + 1]?.focus()
    commit(next)
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    // Arrow navigation between boxes — the boxes are one logical control.
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Paste is handled on EVERY box, not just the first: users routinely paste
  // into whichever box happens to have focus.
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    fill(e.clipboardData.getData('text'))
  }

  return (
    <div role="group" aria-labelledby={groupLabelId}>
      <span id={groupLabelId} className="sr-only">
        {t('mfa.code_input.group_label')}
      </span>
      <div className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            // Enables the OS one-time-code autofill on iOS and Android.
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            aria-label={t('mfa.code_input.digit_label', { n: i + 1 })}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`focus-ring w-11 h-13 text-center text-xl font-semibold border rounded-xl bg-background disabled:opacity-50 ${
              error ? 'border-destructive' : 'border-input'
            }`}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm text-center mt-3">
          {error}
        </p>
      )}
    </div>
  )
}
