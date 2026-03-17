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
  logo_url?: string
  website?: string
  instagram?: string
}

export interface Pet {
  id: string
  rescue_center_id: string
  name: string
  description: string
  age: number
  gender: 'male' | 'female'
  species: 'dog' | 'cat'
  status: string
  short_slug: string
  photos: Photo[]
  conditions: string[]
  condition_notes: string | null
  vaccinated: boolean
  castrated: boolean
  size: 'small' | 'medium' | 'large'
  rescue_center?: PetRescueCenter
  submission_count?: number
}

export async function listPets(rescueCenterId: string): Promise<Pet[]> {
  const res = await apiClient(`/api/v1/pets?rescue_center_id=${rescueCenterId}`)
  if (!res.ok) return []
  return res.json()
}

export async function createPet(data: { name: string; description: string; age: number; gender: 'male' | 'female'; species: 'dog' | 'cat'; vaccinated: boolean; castrated: boolean; size: 'small' | 'medium' | 'large'; conditions?: string[]; condition_notes?: string }): Promise<Pet> {
  const res = await apiClient('/api/v1/pets', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) throw new Error('Failed to create pet')
  return res.json()
}

export async function updatePet(id: string, data: { name?: string; description?: string; age?: number; gender?: 'male' | 'female'; species?: 'dog' | 'cat'; vaccinated?: boolean; castrated?: boolean; size?: 'small' | 'medium' | 'large'; conditions?: string[]; condition_notes?: string }): Promise<Pet> {
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
