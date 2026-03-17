import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface Submission {
  id: string
  form_id: string
  pet_id: string
  member_id: string
  answers: Record<string, string | string[]>
  status: 'pending' | 'approved' | 'rejected'
  rejection_note: string | null
  submitted_at: string
  reviewed_at: string | null
  // joined fields for list view
  pet_name?: string
  pet_photo_url?: string
  member_name?: string
  member_email?: string
  form_name?: string
}

export async function submitAdoptionForm(
  petId: string,
  input: { form_id: string; answers: Record<string, string | string[]> }
): Promise<{ data: { submission_id: string } | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/pets/${petId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al enviar solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// Uses raw fetch — same multipart pattern as pet photo uploads
export async function uploadSubmissionFile(
  submissionId: string,
  fieldId: string,
  file: File
): Promise<{ data: { url: string } | null; error: string | null }> {
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('field_id', fieldId)
    const res = await fetch(`${BASE_URL}/api/v1/submissions/${submissionId}/files`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al subir archivo' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function listSubmissions(
  params?: { status?: 'pending' | 'approved' | 'rejected'; pet_id?: string }
): Promise<{ data: Submission[] | null; error: string | null }> {
  try {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.pet_id) query.set('pet_id', params.pet_id)
    const qs = query.toString()
    const res = await apiClient(`/api/v1/submissions${qs ? '?' + qs : ''}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar solicitudes' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getSubmission(
  id: string
): Promise<{ data: Submission | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/submissions/${id}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function reviewSubmission(
  id: string,
  input: { status: 'approved' | 'rejected'; rejection_note?: string }
): Promise<{ data: Submission | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/submissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar solicitud' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
