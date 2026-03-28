import { apiClient } from './client'

export interface EventItem {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  photo_url: string | null
  rescue_center: {
    id: string
    name: string
    logo_url: string | null
  }
  attendee_count: number
  is_attending: boolean
  created_at: string
}

export interface CreateEventInput {
  title: string
  description: string
  date: string
  time: string
  location: string
}

export async function getEvents(): Promise<{ data: EventItem[] | null; error: string | null }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events`, {
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al obtener eventos' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getEvent(id: string): Promise<{ data: EventItem | null; error: string | null }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/${id}`, {
      credentials: 'include',
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al obtener evento' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function createEvent(data: CreateEventInput): Promise<{ data: EventItem | null; error: string | null }> {
  const res = await apiClient('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear evento' }
  return { data: json, error: null }
}

export async function updateEvent(id: string, data: Partial<CreateEventInput>): Promise<{ data: EventItem | null; error: string | null }> {
  const res = await apiClient(`/api/v1/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al actualizar evento' }
  return { data: json, error: null }
}

export async function deleteEvent(id: string): Promise<{ data: null; error: string | null }> {
  const res = await apiClient(`/api/v1/events/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const json = await res.json()
    return { data: null, error: json.error || 'Error al eliminar evento' }
  }
  return { data: null, error: null }
}

export async function toggleAttendance(id: string): Promise<{ data: { attending: boolean; attendee_count: number } | null; error: string | null }> {
  const res = await apiClient(`/api/v1/events/${id}/attend`, {
    method: 'POST',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al registrar asistencia' }
  return { data: json, error: null }
}

export async function uploadEventPhoto(id: string, file: File): Promise<{ data: { photo_url: string } | null; error: string | null }> {
  const formData = new FormData()
  formData.append('photo', file)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/${id}/photo`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al subir foto' }
  return { data: json, error: null }
}
