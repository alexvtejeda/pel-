'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface MfaCodeInputProps {
  onComplete: (code: string) => void
  disabled?: boolean
  error?: string | null
}

export function MfaCodeInput({ onComplete, disabled, error }: MfaCodeInputProps) {
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

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (digit && index === 5) {
      const code = newDigits.join('')
      if (code.length === 6) onComplete(code)
    } else if (digit) {
      const code = newDigits.join('')
      if (code.length === 6) onComplete(code)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const newDigits = Array(6).fill('')
    pasted.split('').forEach((d, i) => { newDigits[i] = d })
    setDigits(newDigits)
    if (pasted.length === 6) {
      onComplete(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  return (
    <div>
      <div className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={`w-11 h-13 text-center text-xl font-semibold border rounded-xl bg-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 ${
              error ? 'border-destructive' : 'border-input'
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="text-destructive text-sm text-center mt-3">{error}</p>
      )}
    </div>
  )
}
