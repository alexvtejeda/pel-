'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast } from '@fortawesome/free-solid-svg-icons'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import { MemberAddPetModal } from '@/components/pets/member-add-pet-modal'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { PublicMobileNav } from './public-mobile-nav'

const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  adopter: { es: 'Adoptante', en: 'Adopter' },
  member: { es: 'Miembro', en: 'Member' },
  rescue_center: { es: 'Centro de rescate', en: 'Rescue Center' },
  business: { es: 'Negocio', en: 'Business' },
}

export function PetsHeader() {
  const { user, logout } = useAuth()
  const { unreadChatCount } = useWebSocket()
  const { t, i18n } = useTranslation('pets')
  const router = useRouter()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addPetOpen, setAddPetOpen] = useState(false)
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

  // Fetch is_admin from /auth/me on mount — not stored in AuthUser to prevent spoofing
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!user) return
    apiClient('/api/v1/auth/me').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setIsAdmin(data.is_admin === true)
      }
    }).catch(() => {})
  }, [user])

  const avatarInitial = (user?.display_name?.[0] || user?.email?.[0] || '?').toUpperCase()

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
          <Image src="/assets/logo.svg" alt="Pelú" width={56} height={56} style={{ height: 'auto' }} priority />
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
            href="/aliados"
            className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/aliados' ? 'font-medium' : 'font-light'}`}
          >
            {t('aliados.title', { ns: 'business' })}
          </Link>
          <Link
            href="/eventos"
            className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/eventos' ? 'font-medium' : 'font-light'}`}
          >
            {t('header.events')}
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
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('header.my_account')}
            >
              <Avatar className="h-8 w-8">
                {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.display_name || user.email} />}
                <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
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
            <Avatar className="h-16 w-16">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.display_name || user.email} />}
              <AvatarFallback className="bg-muted text-muted-foreground text-xl font-medium">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
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
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  user?.role === 'rescue_center'
                    ? 'bg-pop-550/10 hover:bg-pop-550/20'
                    : 'hover:bg-muted'
                }`}
              >
                <FontAwesomeIcon
                  icon={faTableColumns}
                  className={user?.role === 'rescue_center' ? 'text-xl text-pop-550' : 'text-lg text-muted-foreground'}
                />
                {t('header.dashboard')}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faTableColumns} className="text-lg text-muted-foreground" />
                {t('admin.title')}
              </Link>
            )}
            {user?.role === 'member' && (
              <button
                onClick={() => { setSheetOpen(false); setAddPetOpen(true) }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors w-full text-left"
              >
                <FontAwesomeIcon icon={faPaw} className="text-lg text-pop-550" />
                {t('member.publish_pet')}
              </button>
            )}
            {user?.role === 'member' && (
              <Link
                href="/chat"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faComments} className="text-lg text-muted-foreground" />
                {t('chat.my_conversations')}
                {unreadChatCount > 0 && (
                  <span className="ml-auto bg-pop-550 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {unreadChatCount}
                  </span>
                )}
              </Link>
            )}
            {user?.role === 'member' && (
              <Link
                href="/transporte"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faTruckFast} className="text-lg text-muted-foreground" />
                {t('transport', { ns: 'common' })}
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

      <MemberAddPetModal open={addPetOpen} onClose={() => setAddPetOpen(false)} />

      <PublicMobileNav />
    </header>
  )
}
