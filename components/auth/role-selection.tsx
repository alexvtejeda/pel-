'use client'

import { useEffect, useRef } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { useTranslation } from 'react-i18next'
import { UserRole } from '@/lib/types/user'
import { useAuth } from '@/lib/contexts/auth-context'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDog, faShieldCat, faCheck, faStore } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { BackgroundBeams } from '@/components/ui/beams'
import { LogoLoader } from '@/components/logo-loader'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import { getMyBusiness } from '@/lib/api/businesses'

// Where a role lands once its onboarding is done. `member` has no dashboard.
const roleDashboardPaths: Record<UserRole, string> = {
  rescue_center: '/dashboard/rescue-center',
  member: '/',
  business: '/dashboard/business',
}

interface RoleOption {
  value: UserRole
  icon: IconDefinition
  color: string
}

// Copy lives in `auth.role_selection.<value>.*`, keyed off `value`.
const roleOptions: RoleOption[] = [
  { value: 'member', icon: faDog, color: 'var(--color-pop-700)' },
  { value: 'rescue_center', icon: faShieldCat, color: 'var(--color-pop-650)' },
  { value: 'business', icon: faStore, color: 'var(--color-pop-600)' },
]

export function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useLocaleRouter()
  const { t } = useTranslation('auth')
  const { user, setRole } = useAuth()
  const submitted = useRef(false)

  // Auto-redirect returning users who already have a role.
  // The flag marks a deliberate visit — the "Cambiar rol" button in the profile
  // sheet, or the "Rol" breadcrumb inside a wizard. Those users stay on the
  // picker no matter how far along their onboarding is; without the exemption
  // the redirect fires before they can pick anything.
  useEffect(() => {
    if (!user?.role || submitted.current) return
    if (sessionStorage.getItem('pelu_changing_role')) return
    router.push(roleDashboardPaths[user.role])
  }, [user, router])

  // rescue-center-wizard.tsx self-redirects when a center already exists, but
  // the business and member wizards do not — without this check, switching back
  // to a role you already set up replays its whole wizard.
  const onboardingDone = async (role: UserRole): Promise<boolean> => {
    if (role === 'rescue_center') return !!(await getMyRescueCenter()).data
    if (role === 'business') return !!(await getMyBusiness()).data
    return !!user?.display_name
  }

  const handleSubmit = async () => {
    if (!selectedRole) return

    submitted.current = true
    setLoading(true)
    setError(null)
    sessionStorage.removeItem('pelu_changing_role')

    const { error: roleError } = await setRole(selectedRole)

    if (roleError) {
      setError(roleError)
      setLoading(false)
      return
    }

    const done = await onboardingDone(selectedRole)

    // Hard navigation rather than router.push: AuthProvider reads
    // `mfa_setup_required` from /auth/me only on mount, so a soft push into
    // rescue_center/business would leave it stale at false and ProtectedRoute
    // would never force enrollment. A document load re-inits the provider
    // against the freshly re-signed access-token cookie.
    // No setLoading(false) here on purpose: the loader stays up until the next
    // document paints, instead of flashing the role picker back for a frame.
    window.location.href = done
      ? roleDashboardPaths[selectedRole]
      : `/auth/onboarding/${selectedRole}`
  }

  return (
    <div className="dark relative flex min-h-dvh flex-col overflow-x-clip bg-background">
      <BackgroundBeams />
      {/* Stays up through the router.push on success — handleSubmit clears
          `loading` only on the error path, so there is no gap between the
          request finishing and the next screen painting. */}
      {loading && <LogoLoader />}
      <OnboardingNav
        items={[
          { label: t('home', { ns: 'common' }), href: '/' },
          { label: t('register', { ns: 'common' }), href: '/auth/register' },
          { label: t('role', { ns: 'common' }), current: true },
        ]}
      />
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-2xl shadow-post bg-background border-2 p-6 sm:p-10 lg:p-16 rounded-2xl border-border">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">{t('role_selection.title')}</h1>
            <p className="text-muted-foreground">
              {t('role_selection.subtitle')}
            </p>
          </div>

          <div className="grid gap-3 mb-4">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedRole(option.value)}
                className={`p-6 shadow-post rounded-2xl border-2 transition-all duration-300 ease-in-out text-left slide-background [--su-color:color-mix(in_oklch,var(--color-pop-450)_50%,transparent)] bg-background ${
                  selectedRole === option.value
                    ? 'transition-all ease-in duration-300 border-pop-950/10 bg-pop-450/50 inset-shadow-decoration'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl w-10 flex items-center justify-center">
                    <FontAwesomeIcon icon={option.icon} style={{color: option.color}}/>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{t(`role_selection.${option.value}.title`)}</h3>
                    <p className="text-muted-foreground">{t(`role_selection.${option.value}.description`)}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedRole === option.value
                      ? 'border-pop-450 bg-pop-550'
                      : 'border-input'
                  }`}>
                    {selectedRole === option.value && (
                      <FontAwesomeIcon icon={faCheck} className="text-xs text-secondary"/>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!selectedRole || loading}
            className="w-full py-3 px-4 bg-pop-850 text-secondary rounded-xl font-medium hover:bg-pop-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('role_selection.saving') : t('role_selection.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
