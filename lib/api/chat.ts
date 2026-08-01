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
  pet_id?: string // used for transport link
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
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

/**
 * Target of a new conversation. A **resource** id, never a user id — the
 * backend resolves the owner and only lets you reach someone who is publicly
 * listed right now. Exactly one key: the API 400s on both or neither.
 */
export type ConversationTarget = { provider_id: string } | { pet_id: string }

/**
 * Opens (or reuses) a conversation with a listing's owner.
 *
 * Idempotent — calling it twice for the same target returns the same
 * conversation, so the button needs no "already contacted" state.
 */
export async function createConversation(
  target: ConversationTarget
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(target),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al iniciar la conversación' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
