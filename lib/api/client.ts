import { AuthUser, AuthResponse } from '@/lib/types/user'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Session storage ---

export function storeSession(accessToken: string, refreshToken: string, user: AuthUser) {
  localStorage.setItem('pelu_access_token', accessToken)
  localStorage.setItem('pelu_refresh_token', refreshToken)
  localStorage.setItem('pelu_user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('pelu_access_token')
  localStorage.removeItem('pelu_refresh_token')
  localStorage.removeItem('pelu_user')
  window.dispatchEvent(new Event('pelu:session-cleared'))
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('pelu_user')
  return raw ? JSON.parse(raw) : null
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pelu_access_token')
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pelu_refresh_token')
}

// --- Token refresh ---

async function attemptRefresh(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return false

  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    clearSession()
    return false
  }

  const data: AuthResponse = await res.json()
  storeSession(data.access_token, data.refresh_token, data.user)
  return true
}

// --- Fetch wrapper ---

export async function apiClient(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = getStoredAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      const newToken = getStoredAccessToken()
      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
    }
  }

  return res
}
