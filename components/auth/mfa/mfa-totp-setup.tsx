'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { MfaCodeInput } from './mfa-code-input'
import { useMfaError } from './use-mfa-error'

interface MfaTotpSetupProps {
  onSuccess: (recoveryCodes?: string[]) => void
  onBack: () => void
}

export function MfaTotpSetup({ onSuccess, onBack }: MfaTotpSetupProps) {
  const { t } = useTranslation('auth')
  const resolveError = useMfaError()
  const [step, setStep] = useState<'loading' | 'scan' | 'confirm' | 'failed'>('loading')
  const [secret, setSecret] = useState('')
  const [qrUri, setQrUri] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // useMfaError() hands back a fresh closure on every render. Holding it in a ref
  // keeps startSetup stable, so the mount effect below fires once instead of
  // refetching on every render.
  const resolveErrorRef = useRef(resolveError)
  resolveErrorRef.current = resolveError

  const startSetup = useCallback(() => {
    setStep('loading')
    setError(null)
    mfaApi
      .totpSetup()
      .then(({ data, error: err }) => {
        if (err || !data) {
          // Was: setError(err) with step stuck on 'loading', which rendered a
          // spinner forever and trapped the user with no way back.
          setError(resolveErrorRef.current(err))
          setStep('failed')
          return
        }
        setSecret(data.secret)
        setQrUri(data.qr_uri)
        setStep('scan')
      })
      // totpSetup() rejects rather than resolves when the API is unreachable or
      // answers with a non-JSON body — the same trap, so it lands on the same step.
      .catch(() => setStep('failed'))
  }, [])

  useEffect(() => { startSetup() }, [startSetup])

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
        <Spinner className="text-2xl text-pop-550" />
      </div>
    )
  }

  if (step === 'failed') {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="focus-ring flex items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          {t('mfa.enrollment.back')}
        </button>
        <ErrorState message={error ?? undefined} onRetry={startSetup} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="focus-ring flex items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground">
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        {t('mfa.enrollment.back')}
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
