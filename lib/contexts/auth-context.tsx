'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { AuthUser, UserRole, MfaChallengeResponse, isMfaChallenge } from '@/lib/types/user'
import { apiClient } from '@/lib/api/client'
import * as authApi from '@/lib/api/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  mfaSetupRequired: boolean
  login: (email: string, password: string) => Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null; user: AuthUser | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setRole: (role: UserRole) => Promise<{ error: string | null }>
  updateSession: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  mfaSetupRequired: false,
  login: async () => ({ error: null, mfaChallenge: null, user: null }),
  register: async () => ({ error: null }),
  logout: async () => {},
  setRole: async () => ({ error: null }),
  updateSession: () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)

  useEffect(() => {
    const handleSessionCleared = () => {
      setUser(null)
      setMfaSetupRequired(false)
    }
    window.addEventListener('pelu:session-cleared', handleSessionCleared)
    return () => window.removeEventListener('pelu:session-cleared', handleSessionCleared)
  }, [])

  useEffect(() => {
    // Clear stale localStorage keys from pre-cookie migration
    localStorage.removeItem('pelu_access_token')
    localStorage.removeItem('pelu_refresh_token')
    localStorage.removeItem('pelu_user')

    const init = async () => {
      try {
        const res = await apiClient('/api/v1/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data)
          setMfaSetupRequired(data.mfa_setup_required === true)
        }
      } catch {
        // Network error — treat as unauthenticated
      }
      setLoading(false)
    }

    init()
  }, [])

  const login = async (email: string, password: string): Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null; user: AuthUser | null }> => {
    const { data, error } = await authApi.login(email, password)
    if (error || !data) return { error, mfaChallenge: null, user: null }

    if (isMfaChallenge(data)) {
      return { error: null, mfaChallenge: data, user: null }
    }

    setUser(data.user)
    return { error: null, mfaChallenge: null, user: data.user }
  }

  const register = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.register(email, password)
    if (data) setUser(data.user as AuthUser)
    return { error }
  }

  const logout = async (): Promise<void> => {
    await authApi.logout()
    setUser(null)
    setMfaSetupRequired(false)
  }

  const setRole = async (role: UserRole): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.setRole(role)
    if (data) setUser(prev => prev ? { ...prev, role: data.user.role } : prev)
    return { error }
  }

  const updateSession = useCallback((newUser: AuthUser) => {
    setUser(newUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, mfaSetupRequired, login, register, logout, setRole, updateSession }}>
      {children}
    </AuthContext.Provider>
  )
}
