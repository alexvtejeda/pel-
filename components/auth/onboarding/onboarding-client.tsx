'use client'

import { OnboardingNav } from './onboarding-nav'
import { useEffect } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { useAuth } from '@/lib/contexts/auth-context'
import { MemberWizard } from './member-wizard'
import { RescueCenterWizard } from './rescue-center-wizard'
import { BusinessWizard } from './business-wizard'

const roleDashboardPaths: Record<string, string> = {
  rescue_center: '/dashboard/rescue-center',
  member: '/',
  business: '/',
}

const validRoles = ['member', 'rescue_center', 'business']

export function OnboardingClient({ role }: { role: string }) {
  const { user, loading } = useAuth()
  const router = useLocaleRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (user.role && user.role !== role) {
      router.replace(`/auth/onboarding/${user.role}`)
      return
    }
    if (!validRoles.includes(role)) {
      router.replace(user.role ? (roleDashboardPaths[user.role] ?? '/') : '/')
    }
  }, [user, loading, role, router])

  if (loading || !user) return null

  if (role === 'member') return <MemberWizard />
  if (role === 'rescue_center') return <RescueCenterWizard />
  if (role === 'business') return <BusinessWizard />

  return null
}
