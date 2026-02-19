'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole, Language } from '@/lib/types/user'
import { setDocument, timestamp } from '@/lib/firebase/firestore'
import { getCurrentUser } from '@/lib/firebase/auth'
import { useAuth } from '@/lib/contexts/auth-context'

const roleDashboardPaths: Record<UserRole, string> = {
  rescue_center: '/dashboard/rescue-center',
  adopter: '/',
  owner: '/',
}

interface RoleOption {
  value: UserRole
  title: string
  description: string
  icon: string
}

const roleOptions: RoleOption[] = [
  {
    value: 'adopter',
    title: 'Adoptante',
    description: 'Quiero adoptar una mascota',
    icon: '🏠',
  },
  {
    value: 'owner',
    title: 'Dueño de mascota',
    description: 'Quiero dar en adopción mi mascota',
    icon: '🐕',
  },
  {
    value: 'rescue_center',
    title: 'Centro de rescate',
    description: 'Represento un centro de rescate animal',
    icon: '🏥',
  },
]

export function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { userProfile, refreshProfile } = useAuth()

  // Auto-redirect if user already has a role
  useEffect(() => {
    if (userProfile?.role) {
      router.push(roleDashboardPaths[userProfile.role])
    }
  }, [userProfile, router])

  const handleSubmit = async () => {
    if (!selectedRole) return

    setLoading(true)
    setError(null)

    const user = getCurrentUser()
    if (!user) {
      setError('No se encontró usuario autenticado')
      setLoading(false)
      return
    }

    // Create user profile in Firestore
    const userDocument = {
      uid: user.uid,
      email: user.email || '',
      role: selectedRole,
      preferredLanguage: 'es' as Language,
      profile: {
        name: user.displayName || '',
        avatarUrl: user.photoURL || undefined,
        location: '',
      },
      createdAt: timestamp(),
    }

    const { error: saveError } = await setDocument('users', user.uid, userDocument)

    if (saveError) {
      setError(saveError)
      setLoading(false)
      return
    }

    // Update auth context with the new profile, then redirect
    await refreshProfile()
    router.push(roleDashboardPaths[selectedRole])
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">¿Cómo quieres usar Pelú?</h1>
          <p className="text-muted-foreground">
            Selecciona tu rol principal
          </p>
        </div>

        <div className="grid gap-4 mb-6">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRole(option.value)}
              className={`p-6 rounded-2xl border-2 transition-all text-left ${
                selectedRole === option.value
                  ? 'border-primary bg-muted'
                  : 'border-border hover:border-input bg-card'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{option.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{option.title}</h3>
                  <p className="text-muted-foreground">{option.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === option.value
                    ? 'border-primary bg-primary'
                    : 'border-input'
                }`}>
                  {selectedRole === option.value && (
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
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
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
