'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { getStoredLanguage, isSupportedLanguage } from '@/lib/i18n/language'
import { switchLocalePath } from '@/lib/i18n/routing'
import { useLocale } from '@/lib/i18n/use-locale'

/**
 * Applies the signed-in user's preferred_lang, but only when the user has not
 * made an explicit choice on this device. Renders nothing.
 *
 * Now a navigation rather than a `changeLanguage()` call: the locale is a route
 * segment, so honouring a profile preference means moving to that route.
 */
export function LanguagePreferenceSync() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  useEffect(() => {
    if (getStoredLanguage()) return
    const preferred = user?.preferred_lang
    if (!isSupportedLanguage(preferred)) return
    if (preferred === locale) return
    const search = typeof window === 'undefined' ? '' : window.location.search
    router.replace(switchLocalePath(pathname ?? '/', preferred, search))
  }, [user?.preferred_lang, locale, pathname, router])

  return null
}
