'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { uploadAvatar, deleteAvatar } from '@/lib/api/auth'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast, faKey, faCamera, faSpinner, faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons'
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
import { usePublicHeaderLogoRect } from '@/components/transitions/use-public-header-logo-rect'
import { TransitionLink } from '@/components/transitions/transition-link'
import { useRouteTransition } from '@/components/transitions/route-transition-context'

const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  adopter: { es: 'Adoptante', en: 'Adopter' },
  member: { es: 'Miembro', en: 'Member' },
  rescue_center: { es: 'Centro de rescate', en: 'Rescue Center' },
  business: { es: 'Negocio', en: 'Business' },
}

export function PetsHeader() {
  const { user, logout, updateSession } = useAuth()
  const { unreadChatCount } = useWebSocket()
  const { t, i18n } = useTranslation('pets')
  const router = useRouter()
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addPetOpen, setAddPetOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLAnchorElement>(null)
  usePublicHeaderLogoRect(logoRef)
  const { navigate: navigateTransition, status: transitionStatus } = useRouteTransition()

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (event.button !== 0) return
    event.preventDefault()
    if (transitionStatus !== 'idle') return
    void navigateTransition('/')
  }

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('avatar.size_error', { ns: 'common' }))
      return
    }
    setAvatarUploading(true)
    const { data, error } = await uploadAvatar(file)
    setAvatarUploading(false)
    if (error || !data) {
      toast.error(error || t('avatar.error', { ns: 'common' }))
      return
    }
    updateSession({ ...user, avatar_url: data.avatar_url })
    toast.success(t('avatar.updated', { ns: 'common' }))
  }

  const handleAvatarRemove = async () => {
    if (!user) return
    setAvatarUploading(true)
    const { error } = await deleteAvatar()
    setAvatarUploading(false)
    if (error) {
      toast.error(error || t('avatar.error', { ns: 'common' }))
      return
    }
    updateSession({ ...user, avatar_url: null })
    toast.success(t('avatar.removed', { ns: 'common' }))
  }

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/" ref={logoRef} onClick={handleLogoClick} className="flex items-center gap-2">
          <Image src="/assets/logo.svg" alt="Pelú" width={56} height={56} style={{ height: 'auto' }} priority />
          <span
            className="text-2xl font-bold overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out"
            style={{ maxWidth: scrolled || navigating ? 0 : '4rem', opacity: scrolled || navigating ? 0 : 1 }}
          >
            Pelú
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-20">
          <TransitionLink
            href="/pets"
            className={`text-xl hover:text-pop-550 transition-colors duration-300 ${pathname === '/pets' ? 'font-medium text-foreground' : 'font-light text-muted-foreground'}`}
          >
            {t('header.pets')}
          </TransitionLink>
          <TransitionLink
            href="/aliados"
            className={`text-xl hover:text-pop-550 transition-colors duration-300 ${pathname === '/aliados' ? 'font-medium text-foreground' : 'font-light text-muted-foreground'}`}
          >
            {t('aliados.title', { ns: 'business' })}
          </TransitionLink>
          <TransitionLink
            href="/eventos"
            className={`text-xl hover:text-pop-550 transition-colors duration-300 ${pathname === '/eventos' ? 'font-medium text-foreground' : 'font-light text-muted-foreground'}`}
          >
            {t('header.events')}
          </TransitionLink>
          <TransitionLink
            href="/about"
            className={`text-xl hover:text-pop-550 transition-colors duration-300 ${pathname === '/about' ? 'font-medium text-foreground' : 'font-light text-muted-foreground'}`}
          >
            {t('header.about')}
          </TransitionLink>
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
                className="px-4 py-2 text-sm font-medium bg-pop-solid text-white rounded-xl hover:bg-pop-850 transition-colors"
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
            <div className="relative">
              <Avatar className="h-16 w-16">
                {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.display_name || user.email} />}
                <AvatarFallback className="bg-muted text-muted-foreground text-xl font-medium">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label={t('avatar.change', { ns: 'common' })}
                className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-pop-solid text-white flex items-center justify-center shadow-sm hover:bg-pop-850 transition-colors disabled:opacity-60"
              >
                <FontAwesomeIcon icon={avatarUploading ? faSpinner : faCamera} className={`text-xs ${avatarUploading ? 'animate-spin' : ''}`} />
              </button>
            </div>
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
              {user?.avatar_url && (
                <div>
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={avatarUploading}
                    className="mt-2 text-xs font-medium text-destructive hover:underline disabled:opacity-60"
                  >
                    {t('avatar.remove', { ns: 'common' })}
                  </button>
                </div>
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
                className={`flex items-center gap-3 px-4 text-sm font-medium rounded-xl transition-colors ${
                  user?.role === 'rescue_center'
                    ? 'py-4 bg-pop-550/10 hover:bg-pop-550/20'
                    : 'py-3 hover:bg-muted'
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
              <Link
                href="/mis-mascotas"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faPaw} className="text-lg text-muted-foreground" />
                {t('member.my_pets')}
              </Link>
            )}
            {user?.role === 'member' && (
              <Link
                href="/servicios"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faHandHoldingHeart} className="text-lg text-muted-foreground" />
                {t('service_providers.nav_entry', { ns: 'business' })}
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
                  <span className="ml-auto bg-pop-solid text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
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
            <Link
              href="/auth/mfa/enrollment"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
            >
              <FontAwesomeIcon icon={faKey} className="text-lg text-muted-foreground" />
              {t('header.setup_mfa')}
            </Link>
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
