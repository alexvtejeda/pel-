import { apiClient } from './client'

export type FieldType =
  | 'short_text' | 'long_text' | 'multiple_choice'
  | 'checkbox' | 'dropdown' | 'date' | 'rating' | 'file_upload'

export interface FollowUp {
  when_answer: string
  field: Omit<FormField, 'follow_ups'>
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  description: string
  required: boolean
  section: string
  options: string[]
  ratingMin: string
  ratingMax: string
  follow_ups: FollowUp[]
}

export interface Form {
  id: string
  rescue_center_id: string
  name: string
  is_special_needs: boolean
  fields: FormField[]
  created_at: string
  updated_at: string
}

export async function listForms(): Promise<{ data: Form[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/forms')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar formularios' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getForm(id: string): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/forms/${id}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar formulario' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function createForm(input: {
  name: string
  is_special_needs: boolean
}): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/forms', { method: 'POST', body: JSON.stringify(input) })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al crear formulario' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function updateForm(
  id: string,
  input: { name?: string; fields?: FormField[] }
): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al guardar formulario' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function deleteForm(id: string): Promise<{ data: null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/forms/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      return { data: null, error: json.error || 'Error al eliminar formulario' }
    }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
