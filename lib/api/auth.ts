import { UserRole, LoginResponse } from '@/lib/types/user'
import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function login(email: string, password: string): Promise<{ data: LoginResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar sesión' }
  return { data: json, error: null }
}

export async function register(email: string, password: string): Promise<{ data: { user: { id: string; email: string; role: null } } | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear cuenta' }
  return { data: json, error: null }
}

export async function logout(): Promise<void> {
  apiClient('/api/v1/auth/logout', { method: 'DELETE' }).catch(() => {})
}

export async function setRole(role: UserRole): Promise<{ data: { user: { role: UserRole } } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al seleccionar rol' }
  return { data: json, error: null }
}

export function googleRedirect(): void {
  window.location.href = `${BASE_URL}/api/v1/auth/google`
}
