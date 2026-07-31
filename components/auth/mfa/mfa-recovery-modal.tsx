'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck, faDownload } from '@fortawesome/free-solid-svg-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface MfaRecoveryCodesProps {
  codes: string[]
  onConfirm: () => void
}

/**
 * The recovery codes plus the acknowledgement that gates leaving them.
 *
 * The backend issues these once and never shows them again, so a single stray
 * click used to be enough to lose them permanently. The way out is now an
 * explicit "I saved them" checkbox, and copy/download exist so that claim can
 * actually be true — the codes are on screen either way, so neither action is
 * allowed to throw (`navigator.clipboard` is undefined on insecure origins and
 * inside some in-app browsers).
 *
 * Rendered by two surfaces: the enrollment flow drops it inline as step 3 of
 * its panel, keeping the step bar honest and the forced-dark shell intact; the
 * settings tabs render it through MfaRecoveryModal below, over a page the user
 * is already standing on.
 */
export function MfaRecoveryCodes({ codes, onConfirm }: MfaRecoveryCodesProps) {
  const { t } = useTranslation('auth')
  const [copied, setCopied] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const asText = codes.join('\n')

  const handleCopy = async () => {
    try {
      // Not `clipboard?.writeText` — optional chaining would swallow the missing
      // API and still flip the button to "¡Copiados!", claiming a copy that
      // never happened. Reaching through it throws, and the catch keeps quiet.
      await navigator.clipboard.writeText(asText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* the codes are on screen and downloadable; copy is only a convenience */
    }
  }

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([asText], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = t('mfa.recovery.filename')
    // Firefox only fires the download for a link that is in the document, and
    // revoking the URL in the same tick can cancel it — hence the detour.
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-4 bg-secondary rounded-xl font-mono text-sm">
        {codes.map((code, i) => (
          <div key={i} className="px-2 py-1">{code}</div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="focus-ring flex flex-1 items-center justify-center gap-2 px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-pop-650" />
          {copied ? t('mfa.recovery.copied') : t('mfa.recovery.copy_all')}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="focus-ring flex flex-1 items-center justify-center gap-2 px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          <FontAwesomeIcon icon={faDownload} className="text-pop-650" />
          {t('mfa.recovery.download')}
        </button>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-sm text-foreground">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="focus-ring size-5 shrink-0 accent-pop-450"
        />
        {t('mfa.recovery.acknowledge')}
      </label>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!acknowledged}
        className="focus-ring w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {t('mfa.recovery.close')}
      </button>
    </div>
  )
}

interface MfaRecoveryModalProps {
  codes: string[]
  onClose: () => void
}

/**
 * The settings-tab presentation: the same codes over the page that requested
 * them.
 *
 * Deliberately not dismissible. `open` is hardcoded and `onOpenChange` is never
 * wired, so nothing Radix can offer — Escape, an outside click, a close button —
 * has anything to call; the two preventDefaults stop those gestures before they
 * are even dispatched. Being a real modal also means the focus trap and the
 * overlay keep the page underneath out of reach, so the codes cannot be walked
 * away from by tabbing into the nav behind them.
 *
 * Note components/ui/dialog.tsx's DialogContent renders no close button of its
 * own, so there is no built-in bypass to hide here.
 */
export function MfaRecoveryModal({ codes, onClose }: MfaRecoveryModalProps) {
  const { t } = useTranslation('auth')

  return (
    <Dialog open>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left">
          <DialogTitle>{t('mfa.recovery.title')}</DialogTitle>
          <DialogDescription>{t('mfa.recovery.subtitle')}</DialogDescription>
        </DialogHeader>

        <MfaRecoveryCodes codes={codes} onConfirm={onClose} />
      </DialogContent>
    </Dialog>
  )
}
