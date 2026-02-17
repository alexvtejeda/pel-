'use client'

import i18n from '@/lib/i18n/index'
import { useEffect, ReactNode } from 'react'

const SUPPORTED = ['es', 'en']

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Runs only on the client after hydration — safe to read localStorage/navigator
    const saved = localStorage.getItem('i18nextLng')
    const browser = navigator.language.split('-')[0]
    const detected = SUPPORTED.includes(saved!) ? saved! : SUPPORTED.includes(browser) ? browser : 'es'
    if (detected !== i18n.language) {
      i18n.changeLanguage(detected)
      localStorage.setItem('i18nextLng', detected)
    }
  }, [])

  return <>{children}</>
}
