import { apiClient } from './client'
import { AuthUser, MfaMethodsResponse } from '@/lib/types/user'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Enrollment (authenticated via apiClient) ---

export async function totpSetup(): Promise<{ data: { secret: string; qr_uri: string } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/totp/setup', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al configurar TOTP' }
  return { data: json, error: null }
}

export async function totpConfirm(code: string): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/totp/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Código inválido' }
  return { data: json, error: null }
}

export async function webauthnRegisterBegin(): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/webauthn/register/begin', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar registro de passkey' }
  return { data: json, error: null }
}

export async function webauthnRegisterFinish(attestation: unknown, name?: string): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/webauthn/register/finish', {
    method: 'POST',
    body: JSON.stringify({ attestation, name }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al registrar passkey' }
  return { data: json, error: null }
}

export async function emailEnable(): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/email/enable', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al habilitar email OTP' }
  return { data: json, error: null }
}

export async function regenerateRecoveryCodes(): Promise<{ data: { recovery_codes: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/recovery/generate', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al regenerar códigos' }
  return { data: json, error: null }
}

// --- Verification (uses mfa_token cookie — credentials: 'include') ---

export async function mfaVerify(method: string, codeOrAssertion: string | unknown): Promise<{ data: { user: AuthUser } | null; error: string | null }> {
  const body = method === 'webauthn'
    ? { method, assertion: codeOrAssertion }
    : { method, code: codeOrAssertion }
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Código inválido o expirado' }
  return { data: json, error: null }
}

export async function mfaEmailSend(): Promise<{ data: unknown | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al enviar código' }
  return { data: json, error: null }
}

export async function webauthnAssertBegin(): Promise<{ data: unknown | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/webauthn/assert/begin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar verificación' }
  return { data: json, error: null }
}

// --- Management (authenticated via apiClient) ---

export async function getMethods(): Promise<{ data: MfaMethodsResponse | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/methods')
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al cargar métodos MFA' }
  return { data: json, error: null }
}

export async function deleteTotp(password: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/totp', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { data: {}, error: null }
  const json = await res.json()
  return { data: null, error: json.error || 'Error al eliminar TOTP' }
}

export async function deleteWebauthn(id: string, password: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient(`/api/v1/auth/mfa/webauthn/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { data: {}, error: null }
  const json = await res.json()
  return { data: null, error: json.error || 'Error al eliminar passkey' }
}

export async function deleteEmail(password: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/email', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { data: {}, error: null }
  const json = await res.json()
  return { data: null, error: json.error || 'Error al eliminar email OTP' }
}
