# Transport Chat Integration — Design Spec

## Goal

Let users request pet transport directly from chat conversations, with system messages for visibility, and add transport navigation links to the member sheet and RC sidebar.

## Approach

Frontend-only navigation + backend system message. The chat "+" button navigates to `/transporte` with query params; the backend handles the system message insertion when `conversation_id` is provided on trip creation.

---

## 1. Chat "+" Button & Dropdown Menu

### Location
Next to the message input bar, to the left of the text field. Present in both:
- `ChatMessageThread` (member `/chat` page)
- RC dashboard `ChatTab`

### Component
shadcn `DropdownMenu` — same pattern as the three-dot menu in `pets-tab.tsx`.

- **Trigger**: `Button variant="ghost" size="icon"` with `faPlus` icon, `rounded-xl`
- **Menu item**: `faTruckFast` icon + "Solicitar transporte"
- **On click**: `router.push(/transporte?pet_id=${conversation.pet_id}&conversation_id=${conversation.id})`

### Data Requirements
`ChatMessageThread` needs access to the current conversation's `pet_id` and `id`. The conversation object from `listConversations()` already includes `id`; `pet_id` may need to be added to the conversation list response or passed as a prop.

---

## 2. System Messages in Chat

### Storage
Messages with `sender_id = NULL` are system messages. Backend change: make `sender_id` nullable in the `messages` table.

### Rendering in ChatMessageThread
When rendering a message where `sender_id === null`:
- **Alignment**: Centered (not left/right)
- **Style**: `bg-muted/50`, `border border-border`, `rounded-2xl`, smaller text (`text-xs`), `text-muted-foreground`
- **Icon**: `faTruckFast` inline before the text
- **Content**: The message body as-is (e.g., "Transporte solicitado para Luna")
- **No read receipts or checkmarks** for system messages
- **No sender name** displayed

### WebSocket
System messages arrive via existing `new_message` event — no new event type. The frontend just checks `sender_id` to determine rendering style.

---

## 3. Transport Creation Form — Query Param Support

### File: `transport-creation-form.tsx`

The form already accepts an `initialPetId` prop. Changes:

- `transport-page.tsx` reads `pet_id` and `conversation_id` from `useSearchParams()`
- Passes `pet_id` as `initialPetId` to `TransportCreationForm`
- Passes `conversation_id` to the form, which includes it in the `requestTrip()` call

### API Change
`requestTrip()` in `lib/api/transport.ts` accepts an optional `conversation_id` field in the request body.

---

## 4. Navigation Links

### Member Sheet (PetsHeader)
**File**: The component that renders the user icon sheet in `PetsHeader`.

- Add "Transporte" link with `faTruckFast` icon
- Position: between "Mis conversaciones" and the logout button
- Links to `/transporte`

### RC Sidebar
**File**: `RescueCenterSidebar` component.

- Add "Transporte" tab with `faTruckFast` icon
- Position: between Chat and Metricas
- Links to `/transporte` as a **full page navigation** (not a dashboard tab) since the map requires full screen
- Uses `router.push('/transporte')` instead of setting the active tab

### RC Mobile Nav
- Transport goes in the "Mas" hamburger sidebar menu, not the bottom 5 tabs
- Same behavior: full page navigation to `/transporte`

---

## 5. Backend Changes (separate session)

These are implemented in the `pelu-api` repo, not in this spec's scope:

- `messages.sender_id` made nullable (migration)
- `POST /transport/request` accepts optional `conversation_id`
- If provided, inserts system message (`sender_id = NULL`, body = "Transporte solicitado para {pet_name}")
- Pushes via WebSocket `new_message` event
- System messages don't increment `unread_count` for the requester

---

## Files Changed (Frontend)

| File | Change |
|---|---|
| `components/chat/chat-message-thread.tsx` | Add "+" dropdown button to input bar; render system messages (centered style) |
| `components/dashboard/rescue-center/chat-tab.tsx` | Pass conversation data to thread for "+" button |
| `components/transport/transport-page.tsx` | Read `pet_id` and `conversation_id` from search params |
| `components/transport/transport-creation-form.tsx` | Accept and pass `conversation_id` to `requestTrip()` |
| `lib/api/transport.ts` | Add optional `conversation_id` to `requestTrip()` |
| `components/pets/pets-header.tsx` (or its sheet component) | Add "Transporte" link to member sheet |
| `components/dashboard/rescue-center/rescue-center-sidebar.tsx` | Add "Transporte" nav item |
| `components/dashboard/rescue-center/mobile-bottom-nav.tsx` | Add "Transporte" to "Mas" menu |
