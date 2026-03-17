import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface MetricsResponse {
  summary: {
    total_views: number
    total_adopt_clicks: number
    conversion_rate: number
  }
  daily: Array<{
    date: string
    views: number
    adopt_clicks: number
  }>
  pets: Array<{
    pet_id: string
    pet_name: string
    pet_photo_url: string | null
    species: 'dog' | 'cat'
    gender: 'male' | 'female'
    views: number
    adopt_clicks: number
    conversion_rate: number
  }>
}

const recentlyTracked = new Set<string>()

export function trackPetEvent(petId: string, eventType: 'view' | 'adopt_click') {
  const key = `${petId}:${eventType}`
  if (recentlyTracked.has(key)) return
  recentlyTracked.add(key)
  setTimeout(() => recentlyTracked.delete(key), 30000)

  fetch(`${BASE_URL}/api/v1/pets/${petId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType }),
  }).catch(() => {})
}

export async function getMetrics(
  period: '7d' | '30d' | 'all'
): Promise<{ data: MetricsResponse | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/pets/metrics?period=${period}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al obtener métricas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
