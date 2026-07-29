import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface UserPet {
  id: string
  user_id: string
  name: string
  age: number
  species: 'dog' | 'cat'
  gender: 'male' | 'female'
  description?: string
  size?: 'small' | 'medium' | 'large'
  vaccinated?: boolean
  castrated?: boolean
  photos?: { id: string; url: string; position: number }[]
  created_at: string
}

export async function createUserPets(
  pets: Omit<UserPet, 'id' | 'user_id' | 'created_at'>[]
): Promise<{ data: UserPet[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/user-pets', {
      method: 'POST',
      body: JSON.stringify(pets),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al guardar mascotas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function listUserPets(): Promise<{ data: UserPet[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/user-pets')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar mascotas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function updateUserPet(
  id: string,
  fields: Partial<Omit<UserPet, 'id' | 'user_id' | 'created_at' | 'photos'>>
): Promise<{ data: UserPet | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/user-pets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar mascota' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function deleteUserPet(id: string): Promise<{ data: null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/user-pets/${id}`, { method: 'DELETE' })
    // 204 No Content on success — nothing to parse
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      return { data: null, error: json.error || 'Error al eliminar mascota' }
    }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function deleteUserPetPhoto(
  petId: string,
  photoId: string
): Promise<{ data: null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/user-pets/${petId}/photos/${photoId}`, { method: 'DELETE' })
    // 204 No Content on success — nothing to parse
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      return { data: null, error: json.error || 'Error al eliminar la foto' }
    }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// Uses raw fetch because multipart/form-data must not have Content-Type set manually
export async function uploadUserPetPhotos(
  petId: string,
  files: File[]
): Promise<{ data: { id: string; url: string; position: number }[] | null; error: string | null }> {
  try {
    const form = new FormData()
    files.forEach(f => form.append('photos', f))
    const res = await fetch(`${BASE_URL}/api/v1/user-pets/${petId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al subir fotos' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
