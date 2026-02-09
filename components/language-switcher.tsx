'use client'

import { useState } from 'react'
import { i18nConfig, type Locale } from '@/lib/i18n/config'

export function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState<Locale>('es')

  const switchLanguage = (locale: Locale) => {
    setCurrentLocale(locale)
    // Will implement actual i18n switching logic with next-i18next later
  }

  return (
    <div className="flex gap-2">
      {i18nConfig.locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLanguage(locale)}
          className={`px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
            currentLocale === locale
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
