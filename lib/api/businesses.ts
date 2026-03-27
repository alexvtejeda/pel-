import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface DayHours {
  open: boolean
  from: string   // "09:00"
  to: string     // "18:00"
}

export interface OperatingHours {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
}

export interface Business {
  id: string
  user_id: string
  name: string
  phone: string
  address: string
  rnc?: string
  instagram?: string
  description?: string
  services: string[]
  other_service: string | null
  operating_hours?: OperatingHours
  cover_photo_url?: string
  price?: number | null
  status: string
  rejection_reason?: string
}

export interface CreateBusinessInput {
  name: string
  phone: string
  address: string
  rnc?: string
  instagram?: string
  description?: string
  services: string[]
  other_service?: string
  operating_hours?: OperatingHours
}

export async function createBusiness(
  data: CreateBusinessInput,
): Promise<{ data: Business | null; error: string | null }> {
  const res = await apiClient('/api/v1/businesses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear negocio' }
  return { data: json, error: null }
}

export async function getMyBusiness(): Promise<{ data: Business | null; error: string | null }> {
  const res = await apiClient('/api/v1/businesses/me')
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al obtener negocio' }
  return { data: json, error: null }
}

export async function updateBusiness(
  data: Partial<CreateBusinessInput & { price: number | null }>,
): Promise<{ data: Business | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/businesses/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar negocio' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function uploadBusinessPhoto(
  file: File,
): Promise<{ data: { url: string } | null; error: string | null }> {
  const form = new FormData()
  form.append('photo', file)

  const res = await fetch(`${BASE_URL}/api/v1/businesses/me/photo`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al subir foto' }
  return { data: json, error: null }
}
