export type UserRole = 'member' | 'rescue_center' | 'business'
export type Language = 'es' | 'en'

export interface AuthUser {
  id: string
  email: string
  role: UserRole | null
  auth_provider: string
  preferred_lang: string
  display_name: string | null
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export interface MfaChallengeResponse {
  mfa_required: true
  mfa_token: string
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
}

export type MfaMethod = 'webauthn' | 'totp' | 'email' | 'recovery'

export interface MfaMethodInfo {
  type: MfaMethod
  id?: string       // only for webauthn
  name?: string     // only for webauthn (e.g. "MacBook Touch ID")
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
