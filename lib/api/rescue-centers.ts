import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface RescueCenter {
  id: string
  user_id: string
  name: string
  rnc?: string
  website?: string
  instagram?: string
  phone: string
  address: string
  city: string
  status: string
}

export interface CreateRescueCenterInput {
  name: string
  phone: string
  address: string
  city?: string
  rnc?: string
  website?: string
  instagram?: string
}

export async function getMyRescueCenter(): Promise<{ data: RescueCenter | null; error: string | null }> {
  const res = await apiClient('/api/v1/rescue-centers/me')
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al obtener centro de rescate' }
  return { data: json, error: null }
}

export async function listRescueCenters(): Promise<RescueCenter[]> {
  const res = await fetch(`${BASE_URL}/api/v1/rescue-centers`)
  if (!res.ok) return []
  return res.json()
}

export async function getRescueCenter(id: string): Promise<RescueCenter | null> {
  const res = await fetch(`${BASE_URL}/api/v1/rescue-centers/${id}`)
  if (!res.ok) return null
  return res.json()
}

export async function createRescueCenter(data: CreateRescueCenterInput): Promise<{ data: RescueCenter | null; error: string | null }> {
  const res = await apiClient('/api/v1/rescue-centers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear centro de rescate' }
  return { data: json, error: null }
}

export async function updateRescueCenter(id: string, data: Partial<CreateRescueCenterInput>): Promise<{ data: RescueCenter | null; error: string | null }> {
  const res = await apiClient(`/api/v1/rescue-centers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al actualizar centro de rescate' }
  return { data: json, error: null }
}
