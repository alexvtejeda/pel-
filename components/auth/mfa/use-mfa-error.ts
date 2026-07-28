'use client'

import { useTranslation } from 'react-i18next'

const MFA_ERROR_KEY_PREFIX = 'mfa.errors.'

/**
 * True when a value returned by lib/api/mfa.ts is one of our own fallback
 * translation keys rather than a backend-supplied (already localized) message.
 */
export function isMfaErrorKey(error: string | null | undefined): boolean {
  return !!error && error.startsWith(MFA_ERROR_KEY_PREFIX)
}

/**
 * Resolves an error returned by lib/api/mfa.ts. Values that look like our
 * translation keys are translated; anything else is a backend message that is
 * already localized and is shown verbatim.
 */
export function useMfaError() {
  const { t } = useTranslation('auth')

  return (error: string | null | undefined): string | null => {
    if (!error) return null
    if (isMfaErrorKey(error)) return t(error)
    return error
  }
}
