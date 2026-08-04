'use client'

import { useEffect, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { getI18n } from '@/lib/i18n/index'
import { clearLegacyLanguage, type SupportedLanguage } from '@/lib/i18n/language'

/**
 * Supplies the i18n instance for the locale in the URL.
 *
 * There is deliberately no language *detection* here any more. The locale is a
 * route segment, so the prerendered HTML and the hydration render derive it from
 * the same value and cannot disagree — which is what fixes the hydration
 * mismatch this component used to cause by calling `changeLanguage()` from an
 * effect. See the note in `lib/i18n/index.ts`.
 *
 * Detection still exists, but only where it is safe: at the unprefixed entry
 * stubs (`app/page.tsx` and friends), which render no translated text and whose
 * only job is to redirect.
 */
export function I18nProvider({
  lang,
  children,
}: {
  lang: SupportedLanguage
  children: ReactNode
}) {
  useEffect(() => {
    // Drops the pre-2026-07 browser-sniffed key. Cosmetic cleanup, no bearing
    // on what renders.
    clearLegacyLanguage()
  }, [])

  return <I18nextProvider i18n={getI18n(lang)}>{children}</I18nextProvider>
}
