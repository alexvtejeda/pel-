'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { MfaBackButton } from './mfa-back-button'
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
  // Remove once useMfaError is memoized on [t]; then useCallback(..., [resolveError])
  // works as originally intended and this ref can go.
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
    try {
      // navigator.clipboard is undefined on insecure origins, where this used to
      // reject into an unhandled rejection. The secret stays on screen either
      // way, so a failed copy is silent — but the tick must not appear.
      await navigator.clipboard.writeText(secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      /* the key is visible above and can be typed by hand */
    }
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

  // The back control sits above the step branches on purpose: `fetch` has no
  // default timeout, so a hung /totp/setup parks the user on the spinner
  // indefinitely. Every step — loading included — needs a way back. The confirm
  // sub-step is the exception: it renders its own back, which returns to the QR
  // instead of discarding the setup, and two back controls would be confusing.
  return (
    <div className="space-y-6">
      {step !== 'confirm' && <MfaBackButton onClick={onBack} />}

      {step === 'loading' && (
        <div className="text-center py-8">
          <Spinner className="text-2xl text-pop-550" />
        </div>
      )}

      {step === 'failed' && <ErrorState message={error ?? undefined} onRetry={startSetup} />}

      {step === 'scan' && (
        <>
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_scan')}</p>
          <div className="flex justify-center p-4 bg-white rounded-xl">
            {/* qrcode.react already marks the svg role="img"; without a title it
                is an image with no accessible name at all. It names the image
                rather than repeating totp_scan above it, which a screen reader
                would then read out twice. */}
            <QRCodeSVG value={qrUri} size={200} title={t('mfa.enrollment.totp_qr_alt')} />
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
          {/* Back to the QR, not out of the setup: the secret is still valid, so
              discarding it to re-scan would be a pointless round trip. */}
          <MfaBackButton onClick={() => { setError(null); setStep('scan') }} />
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_confirm')}</p>
          <MfaCodeInput onComplete={handleConfirm} disabled={verifying} error={error} />
        </>
      )}
    </div>
  )
}
