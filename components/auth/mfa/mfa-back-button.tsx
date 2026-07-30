'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'

interface MfaBackButtonProps {
  onClick: () => void
}

/**
 * The single back control for the MFA setup screens.
 *
 * It exists because the TOTP and passkey screens had drifted apart: one shipped
 * a literal "←" glyph labelled "Cancelar", the other a faArrowLeft labelled
 * "Atrás", so the control changed shape from one screen to the next. Note this
 * is *back*, never *cancel* — `mfa.settings.cancel` is still the right key for a
 * true cancel (mfa-password-confirm.tsx).
 */
export function MfaBackButton({ onClick }: MfaBackButtonProps) {
  const { t } = useTranslation('auth')

  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex items-center gap-2 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
      {t('mfa.enrollment.back')}
    </button>
  )
}
