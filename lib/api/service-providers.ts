import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export type ServiceProviderStatus = 'pending' | 'active' | 'rejected'

/** Backend-validated enums — keep in sync with internal/serviceproviders/repository.go */
export const SERVICE_TYPES = ['transport', 'grooming', 'pet_sitting', 'dog_walking', 'pet_boarding', 'training'] as const
export const PET_TYPES = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'other'] as const

export interface ServiceProvider {
  id: string
  user_id: string
  description: string
  services: string[]
  pet_types: string[]
  experience: string
  address: string
  lat: number
  lng: number
  id_document_url?: string
  id_verified_at?: string
  terms_accepted: boolean
  status: ServiceProviderStatus
  rejection_reason?: string
  created_at: string
  updated_at: string
  /** Admin-list rows only — never present on /service-providers/me */
  applicant_name?: string
  applicant_email?: string
}

export interface ServiceProviderProfileFields {
  description: string
  experience: string
  address: string
  lat: number
  lng: number
  services: string[]
  pet_types: string[]
}

function profileFormData(fields: ServiceProviderProfileFields, idDocument: File): FormData {
  const form = new FormData()
  form.append('description', fields.description)
  form.append('experience', fields.experience)
  form.append('address', fields.address)
  form.append('lat', String(fields.lat))
  form.append('lng', String(fields.lng))
  fields.services.forEach((s) => form.append('services', s))
  fields.pet_types.forEach((p) => form.append('pet_types', p))
  form.append('id_document', idDocument)
  return form
}

// Uses raw fetch because multipart/form-data must not have Content-Type set manually
export async function registerServiceProvider(
  input: ServiceProviderProfileFields & { id_document: File }
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const form = profileFormData(input, input.id_document)
    form.append('terms_accepted', 'true')
    const res = await fetch(`${BASE_URL}/api/v1/service-providers`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al enviar la solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getMyServiceProvider(): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/service-providers/me')
    // Not registered yet is a valid state, not an error.
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar tu perfil de servicios' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

/** Active-status partial update — JSON body, no ID document. */
export async function updateServiceProviderProfile(
  fields: Partial<ServiceProviderProfileFields>
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/service-providers/me', {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar tu perfil' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// Rejected-status re-application — multipart, ID document required. Uses raw fetch (see above).
export async function reapplyServiceProvider(
  input: ServiceProviderProfileFields & { id_document: File }
): Promise<{ data: ServiceProvider | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/service-providers/me`, {
      method: 'PATCH',
      credentials: 'include',
      body: profileFormData(input, input.id_document),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al reenviar la solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
