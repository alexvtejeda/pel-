import { apiClient } from './client'

export interface AppNotification {
  id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

export async function listNotifications(): Promise<{ data: AppNotification[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/notifications')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar notificaciones' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/notifications/${id}/read`, { method: 'PATCH' })
    if (!res.ok) {
      const json = await res.json()
      return { error: json.error || 'Error' }
    }
    return { error: null }
  } catch {
    return { error: 'Error de conexión' }
  }
}
