import { AuthResponse, UserRole } from '@/lib/types/user'
import { apiClient, storeSession, clearSession, getStoredRefreshToken, getStoredUser } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function login(email: string, password: string): Promise<{ data: AuthResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar sesión' }
  storeSession(json.access_token, json.refresh_token, json.user)
  return { data: json, error: null }
}

export async function register(email: string, password: string): Promise<{ data: AuthResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear cuenta' }
  storeSession(json.access_token, json.refresh_token, json.user)
  return { data: json, error: null }
}

export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken()
  if (refreshToken) {
    // Best-effort: don't block on server response
    apiClient('/api/v1/auth/logout', {
      method: 'DELETE',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).catch(() => {})
  }
  clearSession()
}

export async function setRole(role: UserRole): Promise<{ data: { access_token: string; user: AuthResponse['user'] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al seleccionar rol' }

  // Update stored access token and user
  const refreshToken = getStoredRefreshToken()
  if (refreshToken) storeSession(json.access_token, refreshToken, json.user)

  return { data: json, error: null }
}

export function googleRedirect(): void {
  window.location.href = `${BASE_URL}/api/v1/auth/google`
}
