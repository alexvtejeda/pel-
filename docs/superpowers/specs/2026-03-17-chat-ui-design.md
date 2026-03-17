# Chat UI — Design Spec

## Overview

Real-time chat interface between rescue centers and adopters. Conversations are auto-created when an RC approves an adoption form submission. Uses WebSocket for live messaging, typing indicators, and read receipts. Also replaces the Notifications tab with a floating bell icon + Sheet.

## Entry Points

### Rescue Centers
- New **"Chat"** tab in the RC dashboard sidebar (replaces Notifications tab position)
- Bell icon in dashboard header bar → click opens notification Sheet from right

### Members
- New **`/chat`** route — dedicated chat page
- **"Mis conversaciones"** link in the user sidebar sheet (next to "Publicar mascota")
- Unread badge on the chat link

## Global WebSocket Provider

**New file:** `lib/contexts/websocket-context.tsx`

A React context that manages a single WebSocket connection for the entire app.

### Connection Lifecycle
- Connects on app load when user is authenticated with `member` or `rescue_center` role
- Endpoint: `ws://{API_URL}/api/v1/ws` (uses cookie auth)
- Reconnects automatically on disconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Disconnects on logout
- Responds to server pings (heartbeat every 30s)

### Exposed Interface
```tsx
interface WebSocketContextType {
  connected: boolean
  sendMessage: (conversationId: string, body: string) => void
  sendTyping: (conversationId: string) => void
  sendReadReceipt: (conversationId: string, upTo: string) => void
  subscribe: (type: string, handler: (data: any) => void) => () => void  // returns unsubscribe fn
  unreadChatCount: number
  unreadNotificationCount: number
}
```

### Event Dispatching
The provider receives WebSocket messages and dispatches them to registered subscribers via `subscribe()`. Components subscribe to specific event types:
- `new_message` → ChatMessageThread, ChatConversationList
- `typing` → ChatMessageThread
- `read_receipt` → ChatMessageThread
- `new_submission` → NotificationBell, PetsTab (future)
- `submission_reviewed` → NotificationBell

### Unread Counts
- `unreadChatCount`: derived from `GET /conversations` on mount, updated live via `new_message` events (increment) and `read_receipt` events (decrement)
- `unreadNotificationCount`: derived from `GET /notifications` on mount, updated live via WebSocket events

## Chat API Module

**New file:** `lib/api/chat.ts`

```tsx
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
  // Frontend-enriched (from submission data or separate lookup):
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

export async function listConversations(): Promise<{ data: Conversation[] | null; error: string | null }>
export async function listMessages(conversationId: string, cursor?: string): Promise<{ data: Message[] | null; error: string | null }>
```

Both use `apiClient` with `{ data, error }` pattern.

## Shared Chat Components

### ChatConversationList

**New file:** `components/chat/chat-conversation-list.tsx`

Props:
```tsx
interface ChatConversationListProps {
  onSelectConversation: (conversation: Conversation) => void
}
```

Behavior:
- Fetches `listConversations()` on mount
- Subscribes to `new_message` events via WebSocket to update last message + unread count live
- Renders each conversation as a card:
  - Avatar placeholder (faCircleUser)
  - User name (other_user_name or other_user_email)
  - Pet photo thumbnail (16x16 rounded) + pet name in accent color
  - Last message preview (truncated, single line)
  - Relative timestamp ("Hace 5m", "Ayer")
  - Unread count badge (pop-550 circle) if unread_count > 0
- Unread conversations get a warm highlight: `bg-pop-550/5 border border-pop-550/20`
- Empty state: faComments icon + "Los chats se crean al aprobar una solicitud de adopción"
- Click → calls `onSelectConversation`

### ChatMessageThread

**New file:** `components/chat/chat-message-thread.tsx`

Props:
```tsx
interface ChatMessageThreadProps {
  conversation: Conversation
  onBack: () => void
}
```

Behavior:
- **Header:** Back button (faArrowLeft) + avatar + user name + pet photo/name
- **Messages:** Fetches `listMessages(conversationId)` on mount with cursor-based pagination (scroll up to load more)
- **Sent messages:** `bg-pop-550 text-white`, aligned right, rounded `16px 16px 4px 16px`
- **Received messages:** `bg-card border border-border`, aligned left, rounded `16px 16px 16px 4px`
- **Timestamps:** Small text below each message
- **Read receipts:** On sent messages only — single check (✓) for sent, double check (✓✓) for read
- **Date separators:** "Hoy", "Ayer", or formatted date between message groups
- **Typing indicator:** Three animated dots in a received-style bubble, shown when `typing` event received for this conversation (auto-hide after 3s)
- **Input bar:** Text input + send button (faPaperPlane in pop-550 circle). Enter to send. Fires `sendTyping()` while typing (throttled to 1 per 2s)
- **Live updates:** Subscribes to `new_message` for this conversation — appends new messages, auto-scrolls to bottom. Sends `read_receipt` when new messages appear while thread is open.
- **Scroll behavior:** Auto-scroll to bottom on new messages (only if already at bottom). Scroll up loads older messages via cursor pagination.

## Notification Bell

**New file:** `components/dashboard/rescue-center/notification-bell.tsx`

Replaces the Notifications tab. Mounted in the RC dashboard header bar.

- Bell icon (faBell) with unread count badge (red circle, top-right)
- Click opens a Sheet from the right (same pattern as user sidebar in `/pets`)
- Sheet content:
  - Header: "Notificaciones"
  - List of notifications from `GET /notifications`
  - Each item: title, body, relative timestamp
  - Unread items: warm left border (`border-l-3 border-pop-550`) + `bg-pop-550/5`
  - Read items: muted text
  - Click → marks as read via `PATCH /notifications/:id/read`
- Live updates via WebSocket `new_submission` and `submission_reviewed` events

## RC Dashboard Changes

### Sidebar
- **Remove:** `notifications` from Tab type and navItems
- **Add:** `chat` to Tab type, with `faComments` icon, label "Chat"
- Position: after Agenda, before Métricas

### Dashboard Shell
- **Add:** `NotificationBell` component in the header bar (right side, next to SidebarTrigger)
- **Add:** `ChatTab` rendering when `activeTab === 'chat'`
- **Remove:** `NotificationsTab` rendering
- **Update:** Tab type: `'pets' | 'interested' | 'forms' | 'agenda' | 'chat' | 'metrics' | 'settings'`

### ChatTab

**New file:** `components/dashboard/rescue-center/chat-tab.tsx`

Simple wrapper that manages single-panel navigation:
```tsx
const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)

return activeConversation
  ? <ChatMessageThread conversation={activeConversation} onBack={() => setActiveConversation(null)} />
  : <ChatConversationList onSelectConversation={setActiveConversation} />
```

### Mobile Bottom Nav
- Replace `notifications` item with `chat` (faComments icon)

## Member Chat Page

### Route: `/chat`

**New files:**
- `app/chat/page.tsx` — renders `<ChatPage />`
- `app/chat/layout.tsx` — wraps in `<ProtectedRoute requireRole={['member']}>`
- `components/chat/chat-page.tsx` — same single-panel pattern as ChatTab

### Sidebar Sheet Entry
In `components/pets/pets-header.tsx`, add for members (after "Publicar mascota"):
```tsx
{user?.role === 'member' && (
  <Link
    href="/chat"
    onClick={() => setSheetOpen(false)}
    className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
  >
    <FontAwesomeIcon icon={faComments} className="text-lg text-muted-foreground" />
    Mis conversaciones
    {unreadChatCount > 0 && (
      <span className="ml-auto bg-pop-550 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
        {unreadChatCount}
      </span>
    )}
  </Link>
)}
```

## App-Level Integration

### WebSocket Provider Mounting

In the root layout or `AuthProvider`, wrap the app with `WebSocketProvider`:
```tsx
<AuthProvider>
  <WebSocketProvider>
    {children}
  </WebSocketProvider>
</AuthProvider>
```

The provider internally checks `user?.role` and only connects for `member` and `rescue_center` roles.

## Message Styling

| Element | Style |
|---------|-------|
| Sent bubble | `bg-pop-550 text-white rounded-[16px_16px_4px_16px]` |
| Received bubble | `bg-card border border-border rounded-[16px_16px_16px_4px]` |
| Timestamp | `text-[10px] text-muted-foreground` (or `text-white/70` on sent) |
| Read receipt | `✓` sent, `✓✓` read — appended after timestamp on sent messages |
| Typing dots | Three `w-1.5 h-1.5 rounded-full bg-muted-foreground` with staggered bounce animation |
| Date separator | `text-xs text-muted-foreground` centered with subtle line |
| Input | `rounded-xl border border-input` + send button `bg-pop-550 rounded-xl` |
| Unread badge | `bg-pop-550 text-white text-xs font-bold` circle |
| Notification bell badge | `bg-destructive text-white text-[9px]` circle |

## i18n Keys

Add to `pets` namespace:
- `chat.title` — "Chat" / "Chat"
- `chat.empty` — "Los chats se crean al aprobar una solicitud de adopción" / "Chats are created when an adoption request is approved"
- `chat.placeholder` — "Escribe un mensaje..." / "Type a message..."
- `chat.today` — "Hoy" / "Today"
- `chat.yesterday` — "Ayer" / "Yesterday"
- `chat.my_conversations` — "Mis conversaciones" / "My conversations"
- `notifications.title` — "Notificaciones" / "Notifications"
- `notifications.empty` — "Sin notificaciones" / "No notifications"

## Backend Dependencies

None — all required endpoints already exist:
- `GET /api/v1/ws` — WebSocket
- `GET /api/v1/conversations` — conversation list with unread count
- `GET /api/v1/conversations/:id/messages` — cursor-paginated messages
- `GET /api/v1/notifications` — notification list
- `PATCH /api/v1/notifications/:id/read` — mark read

## File Summary

| File | Purpose |
|------|---------|
| `lib/contexts/websocket-context.tsx` | Global WebSocket connection + event dispatching |
| `lib/api/chat.ts` | REST API functions for conversations + messages |
| `components/chat/chat-conversation-list.tsx` | Shared conversation list component |
| `components/chat/chat-message-thread.tsx` | Shared message thread component |
| `components/chat/chat-page.tsx` | Member chat page wrapper |
| `components/dashboard/rescue-center/chat-tab.tsx` | RC dashboard chat tab wrapper |
| `components/dashboard/rescue-center/notification-bell.tsx` | Bell icon + notification Sheet |
| `app/chat/page.tsx` | Member chat route |
| `app/chat/layout.tsx` | Protected route wrapper |
| Modify: `dashboard-shell.tsx` | Add ChatTab, NotificationBell, remove NotificationsTab |
| Modify: `rescue-center-sidebar.tsx` | Replace notifications with chat |
| Modify: `mobile-bottom-nav.tsx` | Replace notifications with chat |
| Modify: `pets-header.tsx` | Add "Mis conversaciones" link for members |
| Modify: root layout | Wrap with WebSocketProvider |
