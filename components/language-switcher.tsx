'use client'

import { useTranslation } from 'react-i18next'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { setStoredLanguage, SupportedLanguage } from '@/lib/i18n/language'
import { switchLocalePath } from '@/lib/i18n/routing'
import { useLocale } from '@/lib/i18n/use-locale'

const LANGUAGES: { code: SupportedLanguage; labelKey: string; short: string }[] = [
  { code: 'es', labelKey: 'language.spanish', short: 'ES' },
  { code: 'en', labelKey: 'language.english', short: 'EN' },
]

/**
 * Quiet ES/EN text toggle. Works logged out; the choice is persisted to
 * localStorage and takes precedence over the profile's preferred_lang.
 *
 * Switching is a *navigation* to the same page under the other locale, not a
 * `changeLanguage()` call — the locale lives in the URL now.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const pathname = usePathname()
  const current = useLocale()

  const choose = (code: SupportedLanguage) => {
    // Persisted even when it matches the current locale: it is what the
    // unprefixed entry stubs read to decide where to send a bare URL.
    setStoredLanguage(code)
    if (code === current) return
    // Read from `window` rather than `useSearchParams` so this component stays
    // usable outside a Suspense boundary — it renders in the header on every
    // page, and `output: 'export'` would demand a boundary around each one.
    const search = typeof window === 'undefined' ? '' : window.location.search
    router.replace(switchLocalePath(pathname ?? '/', code, search))
  }

  return (
    <div
      role="group"
      aria-label={t('language.switch')}
      className={cn('inline-flex items-center gap-0.5 rounded-xl border border-border p-0.5', className)}
    >
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => choose(language.code)}
          aria-current={current === language.code ? 'true' : undefined}
          // Deliberately no aria-label: it would replace the visible "ES"/"EN"
          // as the accessible name and break WCAG 2.5.3 (Label in Name) for
          // voice control — "click EN" would match nothing. The group's own
          // aria-label supplies the context, and title carries the full name as
          // the accessible description plus a pointer tooltip.
          title={t(language.labelKey)}
          className={cn(
            'focus-ring rounded-xl px-2 py-1 text-xs font-medium transition-colors',
            current === language.code
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {language.short}
        </button>
      ))}
    </div>
  )
}
