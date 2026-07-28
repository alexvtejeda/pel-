'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { MfaCodeInput } from './mfa-code-input'
import { useMfaError } from './use-mfa-error'

interface MfaTotpSetupProps {
  onSuccess: (recoveryCodes?: string[]) => void
  onBack: () => void
}

export function MfaTotpSetup({ onSuccess, onBack }: MfaTotpSetupProps) {
  const { t } = useTranslation('auth')
  const resolveError = useMfaError()
  const [step, setStep] = useState<'loading' | 'scan' | 'confirm'>('loading')
  const [secret, setSecret] = useState('')
  const [qrUri, setQrUri] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  useEffect(() => {
    mfaApi.totpSetup().then(({ data, error: err }) => {
      if (err || !data) {
        setError(resolveError(err) || t('mfa.errors.generic'))
        return
      }
      setSecret(data.secret)
      setQrUri(data.qr_uri)
      setStep('scan')
    })
  }, [])

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const handleConfirm = async (code: string) => {
    setVerifying(true)
    setError(null)
    const { data, error: err } = await mfaApi.totpConfirm(code)
    setVerifying(false)
    if (err) {
      setError(resolveError(err))
      return
    }
    onSuccess(data?.recovery_codes)
  }

  if (step === 'loading') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="focus-ring text-sm text-muted-foreground hover:text-foreground">
        ← {t('mfa.settings.cancel')}
      </button>

      {step === 'scan' && (
        <>
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_scan')}</p>
          <div className="flex justify-center p-4 bg-white rounded-xl">
            <QRCodeSVG value={qrUri} size={200} />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('mfa.enrollment.totp_manual')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-xl text-xs font-mono break-all">{secret}</code>
              <button onClick={handleCopySecret} aria-label={t('copy', { ns: 'common' })} className="focus-ring p-2 hover:bg-muted rounded-xl transition-colors">
                <FontAwesomeIcon icon={copiedSecret ? faCheck : faCopy} className="text-base" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setStep('confirm')}
            className="focus-ring w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            {t('mfa.enrollment.continue')}
          </button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_confirm')}</p>
          <MfaCodeInput onComplete={handleConfirm} disabled={verifying} error={error} />
        </>
      )}
    </div>
  )
}
