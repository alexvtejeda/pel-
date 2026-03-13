'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleUser, faTableColumns, faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  adopter: { es: 'Adoptante', en: 'Adopter' },
  member: { es: 'Miembro', en: 'Member' },
  rescue_center: { es: 'Centro de rescate', en: 'Rescue Center' },
  business: { es: 'Negocio', en: 'Business' },
}

export function PetsHeader() {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation('pets')
  const router = useRouter()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [navigating, setNavigating] = useState(false)

  // Track scroll position
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // On route change: keep text collapsed briefly, then let it animate open
  useEffect(() => {
    setNavigating(true)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setNavigating(false))
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  const dashboardHref = user?.role === 'rescue_center'
    ? '/dashboard/rescue-center'
    : user?.role === 'business'
      ? '/dashboard/business'
      : null

  const lang = (i18n.language?.startsWith('en') ? 'en' : 'es') as 'es' | 'en'
  const roleLabel = user?.role ? ROLE_LABELS[user.role]?.[lang] ?? user.role : null

  const handleLogout = async () => {
    setSheetOpen(false)
    await logout()
    router.push('/pets')
  }

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/assets/logo.svg" alt="Pelú" width={56} height={56} priority />
          <span
            className="text-2xl font-bold overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out"
            style={{ maxWidth: scrolled || navigating ? 0 : '4rem', opacity: scrolled || navigating ? 0 : 1 }}
          >
            Pelú
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-20">
          <Link
            href="/pets"
            className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/pets' ? 'font-medium' : 'font-light'}`}
          >
            {t('header.pets')}
          </Link>
          <Link
            href="/about"
            className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/about' ? 'font-medium' : 'font-light'}`}
          >
            {t('header.about')}
          </Link>
        </nav>

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
          {user && (
            <button
              onClick={() => setSheetOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('header.my_account')}
            >
              <FontAwesomeIcon icon={faCircleUser} className="text-xl" />
            </button>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('header.my_account')}</SheetTitle>
            <SheetDescription>{user?.email}</SheetDescription>
          </SheetHeader>

          {/* Profile section */}
          <div className="flex flex-col items-center gap-3 pt-8 pb-6">
            <FontAwesomeIcon icon={faCircleUser} className="w-20 h-20 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-lg font-semibold">
                {user?.display_name || user?.email}
              </p>
              {user?.display_name && (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              )}
              {roleLabel && (
                <span className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                  {roleLabel}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Actions */}
          <nav className="flex flex-col py-2">
            {dashboardHref && (
              <Link
                href={dashboardHref}
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faTableColumns} className="text-lg text-muted-foreground" />
                {t('header.dashboard')}
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors w-full text-left"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-lg" />
              {t('profile.logout')}
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
