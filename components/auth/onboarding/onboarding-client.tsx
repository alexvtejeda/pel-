'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { AdopterWizard } from './adopter-wizard'
import { OwnerWizard } from './owner-wizard'
import { RescueCenterWizard } from './rescue-center-wizard'

const roleDashboardPaths: Record<string, string> = {
  rescue_center: '/dashboard/rescue-center',
  adopter: '/',
  owner: '/',
}

const validRoles = ['adopter', 'owner', 'rescue_center']

export function OnboardingClient({ role }: { role: string }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    // Mismatch: user's role doesn't match the URL segment
    if (user.role && user.role !== role) {
      router.replace(`/auth/onboarding/${user.role}`)
      return
    }
    // Unknown role in URL
    if (!validRoles.includes(role)) {
      router.replace(user.role ? (roleDashboardPaths[user.role] ?? '/') : '/')
    }
  }, [user, loading, role, router])

  if (loading || !user) return null

  if (role === 'adopter') return <AdopterWizard />
  if (role === 'owner') return <OwnerWizard />
  if (role === 'rescue_center') return <RescueCenterWizard />

  return null
}
