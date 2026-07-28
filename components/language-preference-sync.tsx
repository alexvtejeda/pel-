'use client'

import { useEffect } from 'react'
import i18n from '@/lib/i18n/index'
import { useAuth } from '@/lib/contexts/auth-context'
import { getStoredLanguage, isSupportedLanguage } from '@/lib/i18n/language'

/**
 * Applies the signed-in user's preferred_lang, but only when the user has not
 * made an explicit choice on this device. Renders nothing.
 */
export function LanguagePreferenceSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (getStoredLanguage()) return
    const preferred = user?.preferred_lang
    if (!isSupportedLanguage(preferred)) return
    if (preferred !== i18n.language) i18n.changeLanguage(preferred)
  }, [user?.preferred_lang])

  return null
}
