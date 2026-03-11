'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'
import { useAuth } from '@/lib/contexts/auth-context'
import { useTranslation } from 'react-i18next'

export function PetsHeader() {
  const { user } = useAuth()
  const { t } = useTranslation('pets')

  const dashboardHref = user?.role === 'rescue_center'
    ? '/dashboard/rescue-center'
    : user?.role === 'business'
      ? '/dashboard/business'
      : null

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xs border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden sm:flex items-center gap-4">
            <Link
              href="/pets"
              className="text-sm font-medium text-foreground hover:text-pop-550 transition-colors"
            >
              {t('header.pets')}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('header.about')}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm font-medium text-foreground hover:text-pop-550 transition-colors"
              >
                {t('header.login')}
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 text-sm font-medium bg-pop-550 text-white rounded-xl hover:bg-pop-500 transition-colors"
              >
                {t('header.register')}
              </Link>
            </>
          )}
          {user && dashboardHref && (
            <Link
              href={dashboardHref}
              className="px-4 py-2 text-sm font-medium bg-pop-550 text-white rounded-xl hover:bg-pop-500 transition-colors"
            >
              {t('header.dashboard')}
            </Link>
          )}
          {user && !dashboardHref && (
            <Link
              href="/auth/role-selection"
              className="px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"
            >
              {t('header.my_account')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
