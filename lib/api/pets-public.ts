import { Pet } from './pets'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface PetFilters {
  species?: 'dog' | 'cat'
  gender?: 'male' | 'female'
  sort?: 'proximity'
  lat?: number
  lng?: number
}

export async function listPublicPets(
  params?: PetFilters
): Promise<{ data: Pet[] | null; error: string | null }> {
  try {
    const query = new URLSearchParams()
    if (params?.species) query.set('species', params.species)
    if (params?.gender) query.set('gender', params.gender)
    if (params?.sort) query.set('sort', params.sort)
    if (params?.lat != null) query.set('lat', String(params.lat))
    if (params?.lng != null) query.set('lng', String(params.lng))

    const qs = query.toString()
    const url = `${BASE_URL}/api/v1/pets${qs ? '?' + qs : ''}`
    const res = await fetch(url)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar mascotas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
