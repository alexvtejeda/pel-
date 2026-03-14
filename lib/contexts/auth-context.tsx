'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { AuthUser, UserRole, MfaChallengeResponse, isMfaChallenge } from '@/lib/types/user'
import { storeSession, clearSession, getStoredUser, getStoredAccessToken, getStoredRefreshToken } from '@/lib/api/client'
import * as authApi from '@/lib/api/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  mfaSetupRequired: boolean
  login: (email: string, password: string) => Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setRole: (role: UserRole) => Promise<{ error: string | null }>
  updateSession: (user: AuthUser, accessToken: string) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  mfaSetupRequired: false,
  login: async () => ({ error: null, mfaChallenge: null }),
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

function isTokenExpired(accessToken: string): boolean {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

function hasMfaSetupRequired(accessToken: string): boolean {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.mfa_setup_required === true
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)

  useEffect(() => {
    // Listen for session cleared by apiClient on hard 401
    const handleSessionCleared = () => setUser(null)
    window.addEventListener('pelu:session-cleared', handleSessionCleared)
    return () => window.removeEventListener('pelu:session-cleared', handleSessionCleared)
  }, [])

  useEffect(() => {
    const init = async () => {
      const accessToken = getStoredAccessToken()
      const refreshToken = getStoredRefreshToken()
      const storedUser = getStoredUser()

      if (!accessToken || !refreshToken || !storedUser) {
        setLoading(false)
        return
      }

      if (!isTokenExpired(accessToken)) {
        setUser(storedUser)
        setMfaSetupRequired(hasMfaSetupRequired(accessToken))
        setLoading(false)
        return
      }

      // Token expired — try refresh
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (res.ok) {
        const data = await res.json()
        storeSession(data.access_token, data.refresh_token, data.user)
        setUser(data.user)
        setMfaSetupRequired(hasMfaSetupRequired(data.access_token))
      } else {
        clearSession()
      }

      setLoading(false)
    }

    init()
  }, [])

  const login = async (email: string, password: string): Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null }> => {
    const { data, error } = await authApi.login(email, password)
    if (error || !data) return { error, mfaChallenge: null }

    if (isMfaChallenge(data)) {
      return { error: null, mfaChallenge: data }
    }

    setUser(data.user)
    return { error: null, mfaChallenge: null }
  }

  const register = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.register(email, password)
    if (data) setUser(data.user)
    return { error }
  }

  const logout = async (): Promise<void> => {
    await authApi.logout()
    setUser(null)
  }

  const setRole = async (role: UserRole): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.setRole(role)
    if (data) setUser(data.user)
    return { error }
  }

  const updateSession = useCallback((newUser: AuthUser, accessToken: string) => {
    const refreshToken = getStoredRefreshToken()
    if (refreshToken) storeSession(accessToken, refreshToken, newUser)
    setUser(newUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, mfaSetupRequired, login, register, logout, setRole, updateSession }}>
      {children}
    </AuthContext.Provider>
  )
}
