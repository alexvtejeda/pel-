import { apiClient } from './client'
import { AuthUser, MfaMethodsResponse } from '@/lib/types/user'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Helper for mfa_token requests (raw fetch, NOT apiClient) ---

async function mfaFetch(path: string, mfaToken: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mfaToken}`,
      ...(options.headers as Record<string, string> || {}),
    },
  })
}

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

// --- Verification (uses mfa_token, raw fetch) ---

export async function mfaVerify(mfaToken: string, method: string, codeOrAssertion: string | unknown): Promise<{ data: { access_token: string; refresh_token: string; user: AuthUser } | null; error: string | null }> {
  const body = method === 'webauthn'
    ? { method, assertion: codeOrAssertion }
    : { method, code: codeOrAssertion }
  const res = await mfaFetch('/api/v1/auth/mfa/verify', mfaToken, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Código inválido o expirado' }
  return { data: json, error: null }
}

export async function mfaEmailSend(mfaToken: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await mfaFetch('/api/v1/auth/mfa/email/send', mfaToken, { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al enviar código' }
  return { data: json, error: null }
}

export async function webauthnAssertBegin(mfaToken: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await mfaFetch('/api/v1/auth/mfa/webauthn/assert/begin', mfaToken, { method: 'POST' })
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
