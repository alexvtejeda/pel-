import { apiClient } from './client'
import { AuthUser, MfaMethodInfo, MfaMethodsResponse, MfaChallengeResponse } from '@/lib/types/user'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/browser'

// The begin endpoints wrap the WebAuthn options under `options.publicKey` (go-webauthn
// shape) alongside an opaque `session` string the caller must echo back to finish/verify.
type WebauthnRegisterBeginData = { options: { publicKey: PublicKeyCredentialCreationOptionsJSON }; session: string }
type WebauthnAssertBeginData = { options: { publicKey: PublicKeyCredentialRequestOptionsJSON }; session: string }

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

export async function webauthnRegisterBegin(): Promise<{ data: WebauthnRegisterBeginData | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/webauthn/register/begin', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar registro de passkey' }
  return { data: json, error: null }
}

// The backend reads the credential fields at the top level and requires `session` from
// register/begin; the optional `name` defaults to "Security Key" server-side when omitted.
export async function webauthnRegisterFinish(attestation: RegistrationResponseJSON, session: string, name?: string): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/webauthn/register/finish', {
    method: 'POST',
    body: JSON.stringify({ ...attestation, session, name }),
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

// For webauthn, the backend reads the assertion fields at the top level alongside `session`
// from assert/begin; other methods send a `code`.
export async function mfaVerify(method: string, codeOrAssertion: string | AuthenticationResponseJSON, session?: string): Promise<{ data: { user: AuthUser } | null; error: string | null }> {
  const body = method === 'webauthn'
    ? { method, session, ...(codeOrAssertion as AuthenticationResponseJSON) }
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

export async function webauthnAssertBegin(): Promise<{ data: WebauthnAssertBeginData | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/webauthn/assert/begin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar verificación' }
  return { data: json, error: null }
}

export async function mfaChallenge(): Promise<{ data: MfaChallengeResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/challenge`, {
    method: 'GET',
    credentials: 'include',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: json.error || 'Sesión MFA expirada' }
  return { data: json, error: null }
}

// --- Management (authenticated via apiClient) ---

// The backend groups `methods` by kind: { webauthn: [{id,name,created_at}], totp: {created_at},
// email: {} } when enrolled, or `[]` when none. The UI renders a flat list, so flatten into
// MfaMethodInfo[] with `type` taken from the group key (entries carry no `type` of their own).
function flattenMethods(methods: unknown): MfaMethodInfo[] {
  if (!methods || Array.isArray(methods)) return []
  const grouped = methods as {
    webauthn?: { id: string; name: string; created_at: string }[]
    totp?: { created_at: string }
    email?: { created_at?: string }
  }
  const list: MfaMethodInfo[] = []
  for (const c of grouped.webauthn ?? []) {
    list.push({ type: 'webauthn', id: c.id, name: c.name, created_at: c.created_at })
  }
  if (grouped.totp) list.push({ type: 'totp', created_at: grouped.totp.created_at })
  if (grouped.email) list.push({ type: 'email', created_at: grouped.email.created_at ?? '' })
  return list
}

export async function getMethods(): Promise<{ data: MfaMethodsResponse | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/methods')
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al cargar métodos MFA' }
  return { data: { ...json, methods: flattenMethods(json.methods) }, error: null }
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
