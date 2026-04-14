'use client'

import Link from 'next/link'
import { TransitionLink } from '@/components/transitions/transition-link'
import { Logo } from '@/components/logo'
import { useTranslation } from 'react-i18next'

export function Header() {
  const { t } = useTranslation('landing')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xs border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />

          <nav className="flex items-center">
            <TransitionLink
              href="/pets"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.pets')}
            </TransitionLink>
          </nav>

          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
