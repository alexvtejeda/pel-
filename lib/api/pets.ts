import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface Photo {
  id: string
  url: string
  position: number
}

export interface PetRescueCenter {
  id: string
  name: string
  /** 4:1 banner lockup from `LogoUpload`. Belongs on the adoption-form banner. */
  logo_url?: string
  /** The owning user's square profile photo — `users.avatar_url` via `rescue_centers.user_id`. */
  avatar_url?: string
  website?: string
  instagram?: string
}

/**
 * Publisher block for a member-published adoption listing — the counterpart of
 * `PetRescueCenter`. Exactly one of `owner` / `rescue_center` is set on a pet:
 * a listing belongs either to a verified centre or to a person. Both are
 * `omitempty` on the wire (api: internal/pets/handler.go `petResponse`).
 *
 * `display_name` is nullable in the database, and a Google sign-up can skip the
 * onboarding wizard that sets it — never render it without a fallback.
 */
export interface PetOwner {
  id: string
  display_name?: string | null
  email: string
  phone?: string | null
  avatar_url?: string | null
}

export interface Pet {
  id: string
  /** Empty string on a member listing — the pet belongs to `owner`, not a centre. */
  rescue_center_id?: string
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  status: string
  /** Rescue-centre listings only; `petResponse` omits it for member listings. */
  short_slug?: string
  photos: Photo[]
  conditions: string[]
  condition_notes: string | null
  vaccinated: boolean
  castrated: boolean
  size: 'small' | 'medium' | 'large'
  /**
   * Optional weight in pounds, 0–500. A refinement only: transport pricing resolves
   * its band from `size` (which is required) and uses the weight only when present.
   * Serialized `omitempty`, so an absent field means the owner never entered one.
   */
  weight_lb?: number | null
  rescue_center?: PetRescueCenter
  owner?: PetOwner
  submission_count?: number
}

export async function listPets(rescueCenterId: string): Promise<Pet[]> {
  const res = await apiClient(`/api/v1/pets?rescue_center_id=${rescueCenterId}`)
  if (!res.ok) return []
  return res.json()
}

export async function createPet(data: { name: string; description: string; age: number; gender: 'male' | 'female'; species: 'dog' | 'cat'; vaccinated: boolean; castrated: boolean; size: 'small' | 'medium' | 'large'; weight_lb?: number; conditions?: string[]; condition_notes?: string }): Promise<Pet> {
  const res = await apiClient('/api/v1/pets', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create pet')
  return res.json()
}

export async function updatePet(id: string, data: { name?: string; description?: string; age?: number; gender?: 'male' | 'female'; species?: 'dog' | 'cat'; vaccinated?: boolean; castrated?: boolean; size?: 'small' | 'medium' | 'large'; weight_lb?: number; conditions?: string[]; condition_notes?: string }): Promise<Pet> {
  const res = await apiClient(`/api/v1/pets/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to update pet')
  return res.json()
}

export async function deletePet(id: string): Promise<void> {
  await apiClient(`/api/v1/pets/${id}`, { method: 'DELETE' })
}

// Uses raw fetch because multipart/form-data must not have Content-Type set manually
export async function uploadPhotos(petId: string, files: File[]): Promise<Photo[]> {
  const form = new FormData()
  files.forEach((f) => form.append('photos', f))
  const res = await fetch(`${BASE_URL}/api/v1/pets/${petId}/photos`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload photos')
  return res.json()
}

export async function deletePhoto(petId: string, photoId: string): Promise<void> {
  await apiClient(`/api/v1/pets/${petId}/photos/${photoId}`, { method: 'DELETE' })
}

export async function reorderPhotos(petId: string, order: string[]): Promise<void> {
  await apiClient(`/api/v1/pets/${petId}/photos/order`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  })
}
