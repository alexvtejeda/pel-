'use client'

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { setStoredLanguage, SupportedLanguage } from '@/lib/i18n/language'

const LANGUAGES: { code: SupportedLanguage; labelKey: string; short: string }[] = [
  { code: 'es', labelKey: 'language.spanish', short: 'ES' },
  { code: 'en', labelKey: 'language.english', short: 'EN' },
]

/**
 * Quiet ES/EN text toggle. Works logged out; the choice is persisted to
 * localStorage and takes precedence over the profile's preferred_lang.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('common')
  const current: SupportedLanguage = i18n.language?.startsWith('en') ? 'en' : 'es'

  const choose = (code: SupportedLanguage) => {
    setStoredLanguage(code)
    if (code !== i18n.language) i18n.changeLanguage(code)
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
          aria-label={t(language.labelKey)}
          aria-current={current === language.code ? 'true' : undefined}
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
