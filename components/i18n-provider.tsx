'use client'

import { useEffect, ReactNode } from 'react'
import i18n from '@/lib/i18n/index'
import { clearLegacyLanguage, resolveLanguage } from '@/lib/i18n/language'

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Runs only on the client after hydration — safe to read localStorage.
    // No navigator.language sniff: Pelú is Spanish-first and only an explicit
    // choice (or the signed-in user's preferred_lang, applied by
    // LanguagePreferenceSync) may override it.
    clearLegacyLanguage()
    const resolved = resolveLanguage()
    if (resolved !== i18n.language) {
      i18n.changeLanguage(resolved)
    }
  }, [])

  return <>{children}</>
}
