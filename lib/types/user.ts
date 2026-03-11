export type UserRole = 'adopter' | 'member' | 'rescue_center' | 'business'
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
