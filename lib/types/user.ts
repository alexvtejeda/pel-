import { Timestamp } from 'firebase/firestore'

export type UserRole = 'adopter' | 'owner' | 'rescue_center'
export type Language = 'es' | 'en'

export interface UserProfile {
  name: string
  avatarUrl?: string
  location?: string
}

export interface UserDocument {
  uid: string
  email: string
  role: UserRole
  preferredLanguage: Language
  profile: UserProfile
  createdAt: Timestamp
  updatedAt?: Timestamp
}
