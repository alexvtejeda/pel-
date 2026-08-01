export type UserRole = 'member' | 'rescue_center' | 'business'
export type Language = 'es' | 'en'

export interface AuthUser {
  id: string
  email: string
  role: UserRole | null
  auth_provider: string
  preferred_lang: string
  display_name: string | null
  /**
   * Optional, not `string | null`: `phone` is the one `omitempty` field on the
   * auth userResponse (api: internal/auth/handler.go), so it is absent from the
   * payload entirely when unset, while display_name and avatar_url serialise as
   * null. Set via `PATCH /auth/profile`.
   */
  phone?: string | null
  avatar_url: string | null
  mfa_setup_required?: boolean
}

export interface AuthResponse {
  user: AuthUser
}

export interface MfaChallengeResponse {
  mfa_required: true
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
  email: string
  strong_methods_available: boolean
}

export type MfaMethod = 'webauthn' | 'totp' | 'email' | 'recovery'

export interface MfaMethodInfo {
  type: MfaMethod
  id?: string
  name?: string
  created_at: string
}

export interface MfaMethodsResponse {
  mfa_enabled: boolean
  methods: MfaMethodInfo[]
  recovery_codes_remaining: number
}

export type LoginResponse = AuthResponse | MfaChallengeResponse

export function isMfaChallenge(res: LoginResponse): res is MfaChallengeResponse {
  return 'mfa_required' in res && res.mfa_required === true
}
