'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/lib/types/user'
import { useAuth } from '@/lib/contexts/auth-context'
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

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
  const { user, setRole } = useAuth()
  const submitted = useRef(false)

  // Auto-redirect returning users who already have a role
  useEffect(() => {
    if (user?.role && !submitted.current) {
      router.push(roleDashboardPaths[user.role])
    }
  }, [user, router])

  const handleSubmit = async () => {
    if (!selectedRole) return

    submitted.current = true
    setLoading(true)
    setError(null)

    const { error: roleError } = await setRole(selectedRole)

    if (roleError) {
      setError(roleError)
      setLoading(false)
      return
    }

    router.push(`/auth/onboarding/${selectedRole}`)
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
                    <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-primary-foreground" />
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
