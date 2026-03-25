import { apiClient } from './client'

export type TripStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface TripStop {
  id: string
  address: string
  lat: number
  lng: number
  position: number
  completed_at: string | null
}

export interface Trip {
  id: string
  requester_id: string
  driver_id: string | null
  pet_id: string
  status: TripStatus
  stops: TripStop[]
  created_at: string
  updated_at: string
}

export interface DriverLocation {
  trip_id: string
  lat: number
  lng: number
  eta_minutes: number | null
}

interface RequestTripPayload {
  pet_id: string
  stops: { address: string; lat: number; lng: number }[]
  conversation_id?: string // links transport request to chat
}

export async function requestTrip(payload: RequestTripPayload): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/transport/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al crear el viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function listTrips(role?: string): Promise<{ data: Trip[] | null; error: string | null }> {
  try {
    const qs = role ? `?role=${encodeURIComponent(role)}` : ''
    const res = await apiClient(`/api/v1/transport${qs}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar viajes' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function cancelTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/cancel`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cancelar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// --- Driver-side functions (future phase, included for API completeness) ---

export async function acceptTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/accept`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al aceptar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function updateTripStatus(id: string, status: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar estado' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function completeStop(tripId: string, stopId: string): Promise<{ data: null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${tripId}/stops/${stopId}/complete`, { method: 'PATCH' })
    if (!res.ok) { const json = await res.json(); return { data: null, error: json.error || 'Error al completar parada' } }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
