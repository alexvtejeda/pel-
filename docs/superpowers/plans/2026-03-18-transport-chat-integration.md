# Transport Chat Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users request pet transport from chat conversations, show system messages in chat, and add transport navigation links to member sheet and RC sidebar.

**Architecture:** The chat "+" button navigates to `/transporte?pet_id=X&conversation_id=Y`. The transport creation form passes `conversation_id` to the backend, which inserts a system message (`sender_id = NULL`). The frontend renders system messages as centered, muted pills. Navigation links are added to the member sheet and RC sidebar.

**Tech Stack:** Next.js, React, shadcn/ui DropdownMenu, FontAwesome, react-i18next

**Spec:** `docs/superpowers/specs/2026-03-18-transport-chat-integration-design.md`

---

### Task 1: Update TypeScript types for system messages and conversation pet_id

**Files:**
- Modify: `lib/api/chat.ts:3-24`
- Modify: `lib/api/transport.ts:32-35`

- [ ] **Step 1: Update `Message.sender_id` to be nullable**

In `lib/api/chat.ts`, change the `Message` interface:

```typescript
export interface Message {
  id: string
  conversation_id: string
  sender_id: string | null  // null = system message
  body: string
  is_read: boolean
  created_at: string
}
```

- [ ] **Step 2: Add `pet_id` to `Conversation` interface**

In `lib/api/chat.ts`, add `pet_id` to the `Conversation` interface:

```typescript
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
  pet_id?: string  // NEW — used for transport link
}
```

- [ ] **Step 3: Add `conversation_id` to `RequestTripPayload`**

In `lib/api/transport.ts`, update the interface:

```typescript
interface RequestTripPayload {
  pet_id: string
  stops: { address: string; lat: number; lng: number }[]
  conversation_id?: string  // NEW — links transport request to chat
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/api/chat.ts lib/api/transport.ts
git commit -m "feat: update types for system messages and conversation pet_id"
```

---

### Task 2: Render system messages in ChatMessageThread

**Files:**
- Modify: `components/chat/chat-message-thread.tsx:6,125-139,240-272`

- [ ] **Step 1: Add `faTruckFast` to imports**

In `chat-message-thread.tsx`, update the FontAwesome import on line 6:

```typescript
import { faArrowLeft, faCircleUser, faPaperPlane, faSpinner, faTruckFast } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Coerce `sender_id` to null in WebSocket message construction**

In the `new_message` WebSocket handler (around line 125), the message object is constructed with `sender_id: m.sender_id`. If the backend omits `sender_id` for system messages, this will be `undefined` instead of `null`. Change:

```typescript
        sender_id: m.sender_id,
```

to:

```typescript
        sender_id: m.sender_id ?? null,
```

- [ ] **Step 3: Skip read receipts for system messages**

In the `new_message` WebSocket handler (around line 138), change the read receipt condition from:

```typescript
      if (m.sender_id !== user?.id) {
        sendReadReceipt(conversation.id, msg.created_at)
      }
```

to:

```typescript
      if (m.sender_id && m.sender_id !== user?.id) {
        sendReadReceipt(conversation.id, msg.created_at)
      }
```

Also in the "send read receipt on mount" effect (around line 169), change:

```typescript
    const lastReceived = [...messages].reverse().find(m => m.sender_id !== user?.id)
```

to:

```typescript
    const lastReceived = [...messages].reverse().find(m => m.sender_id && m.sender_id !== user?.id)
```

- [ ] **Step 4: Add system message rendering branch**

In the message rendering loop (around line 240-272), add a system message branch. Replace the inner content of `messages.map((msg, i) => { ... })`:

```tsx
            {messages.map((msg, i) => {
              const isSystem = msg.sender_id === null
              const isSent = !isSystem && msg.sender_id === user?.id
              const showDate = i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at)

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        {getDateLabel(msg.created_at, todayLabel, yesterdayLabel)}
                      </span>
                    </div>
                  )}

                  {isSystem ? (
                    <div className="flex justify-center my-3">
                      <div className="bg-muted/50 border border-border rounded-2xl px-4 py-2 flex items-center gap-2">
                        <FontAwesomeIcon icon={faTruckFast} className="text-xs text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{msg.body}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex mb-2 ${isSent ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] px-3 py-2 ${
                          isSent
                            ? 'bg-pop-550 text-background rounded-[16px_16px_4px_16px]'
                            : 'bg-card border border-border rounded-[16px_16px_16px_4px]'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap wrap-break-words">{msg.body}</p>
                        <p className={`text-[10px] mt-1 ${isSent ? 'text-background text-right' : 'text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                          {isSent && (
                            <span className="ml-1">{msg.is_read ? '\u2713\u2713' : '\u2713'}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
```

- [ ] **Step 5: Verify manually**

Open a chat conversation in the browser. System messages won't appear yet (backend not deployed), but regular messages should still render correctly with no regressions.

- [ ] **Step 6: Commit**

```bash
git add components/chat/chat-message-thread.tsx
git commit -m "feat: render system messages as centered muted pills in chat"
```

---

### Task 3: Add "+" dropdown button to chat input bar

**Files:**
- Modify: `components/chat/chat-message-thread.tsx:6-9,293-310`

- [ ] **Step 1: Add imports**

Add to the existing imports in `chat-message-thread.tsx`:

```typescript
import { faArrowLeft, faCircleUser, faPaperPlane, faSpinner, faTruckFast, faPlus } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
```

- [ ] **Step 2: Add router hook**

Inside the `ChatMessageThread` component, add after the existing hooks:

```typescript
  const router = useRouter()
```

- [ ] **Step 3: Add "+" dropdown to the input bar**

Replace the input bar section (the `{/* Input Bar */}` div, lines 293-310) with:

```tsx
      {/* Input Bar */}
      <div className="flex items-center gap-2 p-4 border-t border-border bg-background shrink-0">
        {conversation.pet_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl shrink-0 w-9 h-9">
                <FontAwesomeIcon icon={faPlus} className="text-sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => router.push(`/transporte?pet_id=${conversation.pet_id}&conversation_id=${conversation.id}`)}>
                <FontAwesomeIcon icon={faTruckFast} className="text-base" />
                Solicitar transporte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          className="flex-1 rounded-xl border border-input bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pop-550"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-pop-550 text-white rounded-xl p-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
        </button>
      </div>
```

The "+" button only shows when `conversation.pet_id` exists. When clicked, "Solicitar transporte" navigates to `/transporte?pet_id=X&conversation_id=Y`.

- [ ] **Step 4: Verify manually**

Open a chat conversation in the browser (both the member `/chat` page AND the RC dashboard Chat tab). The "+" button should appear to the left of the text input. Clicking it should show a dropdown with "Solicitar transporte". Clicking the menu item should navigate to `/transporte` with query params. The "+" button should be hidden if the conversation has no `pet_id`.

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-message-thread.tsx
git commit -m "feat: add transport request dropdown button to chat input bar"
```

---

### Task 4: Pass `conversation_id` through transport creation flow

**Files:**
- Modify: `app/transporte/page.tsx:7-11`
- Modify: `components/transport/transport-page.tsx:17-21,131-138`
- Modify: `components/transport/transport-creation-form.tsx:18-21,102-108`

- [ ] **Step 1: Read `conversation_id` from search params in route page**

In `app/transporte/page.tsx`, update `TransportContent`:

```tsx
function TransportContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('pet_id') ?? undefined
  const conversationId = searchParams?.get('conversation_id') ?? undefined
  return <TransportPage initialPetId={petId} conversationId={conversationId} />
}
```

- [ ] **Step 2: Thread `conversationId` through `TransportPage`**

In `components/transport/transport-page.tsx`, update the interface and pass it down:

```typescript
interface TransportPageProps {
  initialPetId?: string
  conversationId?: string
}

export function TransportPage({ initialPetId, conversationId }: TransportPageProps) {
```

Then in the JSX where `TransportCreationForm` is rendered (around line 132):

```tsx
      {pageState === 'none' && (
        <TransportCreationForm
          initialPetId={initialPetId}
          conversationId={conversationId}
          onTripCreated={(newTrip) => {
            setTrip(newTrip)
            setPageState('pending')
          }}
        />
      )}
```

- [ ] **Step 3: Accept and use `conversationId` in `TransportCreationForm`**

In `components/transport/transport-creation-form.tsx`, update the props interface:

```typescript
interface TransportCreationFormProps {
  initialPetId?: string
  conversationId?: string
  onTripCreated: (trip: Trip) => void
}

export function TransportCreationForm({ initialPetId, conversationId, onTripCreated }: TransportCreationFormProps) {
```

Then in `handleSubmit`, update the `requestTrip` call (around line 102):

```typescript
    const { data, error } = await requestTrip({
      pet_id: selectedPetId,
      stops: [
        { address: pickupAddress, lat: pickupCoords.lat, lng: pickupCoords.lng },
        { address: dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      ],
      ...(conversationId ? { conversation_id: conversationId } : {}),
    })
```

- [ ] **Step 4: Verify manually**

Navigate to `/transporte?pet_id=some-id&conversation_id=some-conv-id`. The pet should be pre-selected and submitting the form should include `conversation_id` in the request body (check Network tab).

- [ ] **Step 5: Commit**

```bash
git add app/transporte/page.tsx components/transport/transport-page.tsx components/transport/transport-creation-form.tsx
git commit -m "feat: pass conversation_id through transport creation flow"
```

---

### Task 5: Add "Transporte" link to member sheet in PetsHeader

**Files:**
- Modify: `components/pets/pets-header.tsx:11,198-213`

- [ ] **Step 1: Add `faTruckFast` to imports**

In `pets-header.tsx`, update the FontAwesome import (line 11):

```typescript
import { faCircleUser, faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Add transport link between "Mis conversaciones" and logout**

In the nav section of the Sheet (after the "Mis conversaciones" Link block ending at line 213, before the logout button at line 214), add:

```tsx
            {user?.role === 'member' && (
              <Link
                href="/transporte"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faTruckFast} className="text-lg text-muted-foreground" />
                Transporte
              </Link>
            )}
```

- [ ] **Step 3: Verify manually**

Open the app as a member user. Click the user icon to open the sheet. "Transporte" should appear between "Mis conversaciones" and "Cerrar sesión". Clicking it should navigate to `/transporte` and close the sheet.

- [ ] **Step 4: Commit**

```bash
git add components/pets/pets-header.tsx
git commit -m "feat: add transport link to member sheet in PetsHeader"
```

---

### Task 6: Add "Transporte" nav item to RC sidebar

**Files:**
- Modify: `components/dashboard/rescue-center/rescue-center-sidebar.tsx:4,7,17,44,58-73`

- [ ] **Step 1: Add imports**

In `rescue-center-sidebar.tsx`, add to existing imports:

```typescript
import { faPaw, faUsers, faClipboardList, faCalendarDays, faComments, faChartLine, faGear, faTruckFast } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
```

- [ ] **Step 2: Add router hook**

Inside `RescueCenterSidebar`, add after the existing hooks:

```typescript
  const router = useRouter()
```

- [ ] **Step 3: Insert transport nav item between Chat and Metricas**

The `navItems` array currently has items in order: pets, interested, forms, agenda, chat, metrics, settings. We need to insert a transport item (which uses `router.push` instead of `onTabChange`) between chat and metrics.

Replace the `SidebarMenu` rendering block inside `SidebarContent` with:

```tsx
        <SidebarMenu className={`my-5 gap-8 ${state === 'collapsed' ? 'items-center gap-8' : ''}`}>
          {navItems.map(({ tab, label, icon }) => (
            <>
              <SidebarMenuItem key={tab}>
                <SidebarMenuButton
                  isActive={activeTab === tab}
                  onClick={() => onTabChange(tab)}
                  tooltip={label}
                  className={state === 'collapsed' ? 'p-3' : ''}
                >
                  <FontAwesomeIcon icon={icon} className="text-md" />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {tab === 'chat' && (
                <SidebarMenuItem key="transport">
                  <SidebarMenuButton
                    onClick={() => router.push('/transporte')}
                    tooltip="Transporte"
                    className={state === 'collapsed' ? 'p-3' : ''}
                  >
                    <FontAwesomeIcon icon={faTruckFast} className="text-md" />
                    <span>Transporte</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          ))}
        </SidebarMenu>
```

This inserts the transport item right after the `chat` item without splitting the array. The transport item uses `router.push('/transporte')` for full-page navigation instead of `onTabChange`.

- [ ] **Step 4: Verify manually**

Open the RC dashboard. The sidebar should show: Mascotas, Interesados, Formulario, Agenda, Chat, **Transporte**, Metricas, Ajustes. Clicking "Transporte" should navigate to `/transporte` (full page). The mobile "Mas" hamburger should also show the transport item since it opens the same sidebar component.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/rescue-center/rescue-center-sidebar.tsx
git commit -m "feat: add transport nav item to RC sidebar between chat and metrics"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Update TS types (nullable sender_id, pet_id, conversation_id) | `lib/api/chat.ts`, `lib/api/transport.ts` |
| 2 | Render system messages in chat (centered muted pills) | `chat-message-thread.tsx` |
| 3 | Add "+" dropdown button to chat input bar | `chat-message-thread.tsx` |
| 4 | Pass conversation_id through transport creation flow | `app/transporte/page.tsx`, `transport-page.tsx`, `transport-creation-form.tsx` |
| 5 | Add "Transporte" link to member sheet | `pets-header.tsx` |
| 6 | Add "Transporte" nav item to RC sidebar | `rescue-center-sidebar.tsx` |
