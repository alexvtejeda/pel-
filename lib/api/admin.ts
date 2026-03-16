import { apiClient } from './client'
import { RescueCenter } from './rescue-centers'
import { Form, FormField } from './forms'

// --- Rescue Centers ---

export async function listAllRescueCenters(): Promise<{ data: RescueCenter[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/rescue-centers')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar centros' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function approveRescueCenter(id: string): Promise<{ data: RescueCenter | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}/approve`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al aprobar' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function rejectRescueCenter(id: string, reason: string): Promise<{ data: RescueCenter | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al rechazar' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function deleteRescueCenter(id: string, mfaCode: string): Promise<{ data: true | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ mfa_method: 'totp', mfa_code: mfaCode }),
    })
    if (res.status === 204) return { data: true, error: null }
    const json = await res.json()
    return { data: null, error: json.error || 'Error al eliminar' }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// --- Form Template ---

export async function getFormTemplate(): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/forms/default')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar plantilla' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function updateFormTemplate(data: { name?: string; fields?: FormField[] }): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/forms/default', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al guardar plantilla' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
