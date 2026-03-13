import { Pet } from './pets'
import { Form } from './forms'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface PetFilters {
  species?: 'dog' | 'cat'
  gender?: 'male' | 'female'
  sort?: 'proximity'
  lat?: number
  lng?: number
  vaccinated?: boolean
  castrated?: boolean
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
    if (params?.vaccinated != null) query.set('vaccinated', String(params.vaccinated))
    if (params?.castrated != null) query.set('castrated', String(params.castrated))

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

export async function getPublicPet(
  id: string
): Promise<{ data: Pet | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/pets/${encodeURIComponent(id)}`)
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar mascota' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export interface PetFormResponse {
  form: Form
  rc: { id: string; name: string; logo_url: string | null; city: string | null }
  advisory: boolean
}

export async function getPetForm(
  petId: string
): Promise<{ data: PetFormResponse | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/pets/${encodeURIComponent(petId)}/form`)
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar formulario' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getPetBySlug(
  slug: string
): Promise<{ data: Pet | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/pets/s/${encodeURIComponent(slug)}`)
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar mascota' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
