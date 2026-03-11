'use client'

import { OnboardingNav } from './onboarding-nav'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { AdopterWizard } from './adopter-wizard'
import { MemberWizard } from './member-wizard'
import { RescueCenterWizard } from './rescue-center-wizard'

const roleDashboardPaths: Record<string, string> = {
  rescue_center: '/dashboard/rescue-center',
  adopter: '/',
  member: '/',
}

const validRoles = ['adopter', 'member', 'rescue_center']

export function OnboardingClient({ role }: { role: string }) {
  const { user, loading } = useAuth()
  const router = useRouter()

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

  if (role === 'adopter') return <AdopterWizard />
  if (role === 'member') return <MemberWizard />
  if (role === 'rescue_center') return <RescueCenterWizard />

  return null
}
