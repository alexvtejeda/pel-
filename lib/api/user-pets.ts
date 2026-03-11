import { apiClient } from './client'

export interface UserPet {
  id: string
  user_id: string
  name: string
  age: number
  species: 'dog' | 'cat'
  gender: 'male' | 'female'
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
