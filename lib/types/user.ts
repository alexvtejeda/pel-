export type UserRole = 'adopter' | 'owner' | 'rescue_center'
export type Language = 'es' | 'en'

export interface AuthUser {
  id: string
  email: string
  role: UserRole | null
  auth_provider: string
  preferred_lang: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}
