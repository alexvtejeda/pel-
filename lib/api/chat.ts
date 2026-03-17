import { apiClient } from './client'

export interface Conversation {
  id: string
  rescue_center_id: string
  member_id: string
  other_user_name: string
  other_user_email: string
  last_message_body: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
  pet_name?: string
  pet_photo_url?: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  is_read: boolean
  created_at: string
}

export async function listConversations(): Promise<{ data: Conversation[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/conversations')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar conversaciones' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function listMessages(
  conversationId: string,
  cursor?: string
): Promise<{ data: Message[] | null; error: string | null }> {
  try {
    const params = new URLSearchParams()
    if (cursor) params.set('cursor', cursor)
    params.set('limit', '50')
    const qs = params.toString()
    const res = await apiClient(`/api/v1/conversations/${conversationId}/messages?${qs}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar mensajes' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
