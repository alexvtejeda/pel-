'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { useTranslation } from 'react-i18next'

export function Header() {
  const { t } = useTranslation('landing')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />

          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
