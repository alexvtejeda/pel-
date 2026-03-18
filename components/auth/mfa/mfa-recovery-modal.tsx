'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'

interface MfaRecoveryModalProps {
  codes: string[]
  onClose: () => void
}

export function MfaRecoveryModal({ codes, onClose }: MfaRecoveryModalProps) {
  const { t } = useTranslation('auth')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-md space-y-4 border shadow-lg">
        <h2 className="text-lg font-semibold">{t('mfa.recovery.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('mfa.recovery.subtitle')}</p>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-xl font-mono text-sm">
          {codes.map((code, i) => (
            <div key={i} className="px-2 py-1">{code}</div>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-base" />
          {copied ? t('mfa.recovery.copied') : t('mfa.recovery.copy_all')}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {t('mfa.recovery.close')}
        </button>
      </div>
    </div>
  )
}
