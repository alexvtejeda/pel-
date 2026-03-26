# Adoption Flow — Transport Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the adoption, chat, and transport subsystems into one end-to-end flow — from adoption approval to pet delivery.

**Architecture:** Glue work across existing systems. No new subsystems. Adds WebSocket event handling for approval notifications, integrates ProviderPicker into chat, adds navigation to notification bell, and handles transport lifecycle toasts.

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS v4, Font Awesome, react-i18next, WebSocket

**Spec:** `docs/superpowers/specs/2026-03-24-adoption-transport-flow-design.md`

**Depends on:** `docs/superpowers/plans/2026-03-25-business-dashboard.md` (ProviderPicker, Requests tab)

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Modify | `lib/contexts/websocket-context.tsx` | Add `business` role to `shouldConnect` |
| Modify | `lib/api/transport.ts` | Align `RequestTripPayload` and `Trip` with backend contract, expand `TripStatus` |
| Modify | `lib/api/notifications-api.ts` | Add `metadata` field to `AppNotification` type |
| Modify | `app/transporte/page.tsx` | Read `trip_id` from searchParams, pass to TransportPage |
| Modify | `components/transport/transport-page.tsx` | Accept `tripId` prop, load specific trip when provided |
| Modify | `components/transport/transport-creation-form.tsx` | Accept `providerId` prop, pass as `target_driver_id` |
| Modify | `components/chat/chat-message-thread.tsx` | ProviderPicker modal before transport redirect, i18n for button text |
| Modify | `components/dashboard/rescue-center/notification-bell.tsx` | Navigate on click via `metadata.link` |
| Create | `components/transport/transport-toast-handler.tsx` | Global WebSocket toast handler for submission_reviewed + trip_status_changed events |
| Modify | `app/layout.tsx` or auth layout | Mount `TransportToastHandler` for all authenticated users |
| Modify | `public/locales/es/transport.json` | Add toast, chat, and status action i18n keys |
| Modify | `public/locales/en/transport.json` | Add toast, chat, and status action i18n keys |

---

## Chunk 1: Prerequisites

### Task 1: WebSocket — add `business` role

**Files:**
- Modify: `lib/contexts/websocket-context.tsx`

- [ ] **Step 1: Update shouldConnect condition**

On line 46, the current condition is:

```tsx
const shouldConnect = user?.role === 'member' || user?.role === 'rescue_center'
```

Add `business`:

```tsx
const shouldConnect = user?.role === 'member' || user?.role === 'rescue_center' || user?.role === 'business'
```

- [ ] **Step 2: Commit**

```bash
git add lib/contexts/websocket-context.tsx
git commit -m "feat: add business role to WebSocket shouldConnect"
```

---

### Task 2: Transport API alignment

**Files:**
- Modify: `lib/api/transport.ts`

- [ ] **Step 1: Expand TripStatus type**

Replace line 3:

```tsx
export type TripStatus = 'pending' | 'active' | 'completed' | 'cancelled'
```

With:

```tsx
export type TripStatus = 'requested' | 'accepted' | 'picking_up' | 'in_transit' | 'completed' | 'cancelled'
```

- [ ] **Step 2: Enrich Trip interface**

Replace the `Trip` interface (lines 14-23) with:

```tsx
export interface Trip {
  id: string
  requester_id: string
  driver_id: string | null
  pet_id: string
  pet_description?: string
  target_driver_id?: string
  conversation_id?: string
  requester_name?: string
  pet_name?: string
  pet_photo_url?: string
  pet_species?: string
  pet_breed?: string
  status: TripStatus
  stops: TripStop[]
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Align RequestTripPayload**

Replace the `RequestTripPayload` interface (lines 32-36) with:

```tsx
interface RequestTripPayload {
  pet_id: string
  pet_description?: string
  target_driver_id: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  stops: { address: string; lat: number; lng: number }[]
  conversation_id?: string
  rescue_center_id?: string
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/api/transport.ts
git commit -m "feat: align transport API types with backend contract"
```

---

### Task 3: Transport page — trip_id query param support

**Files:**
- Modify: `app/transporte/page.tsx`
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Read trip_id from searchParams**

In `app/transporte/page.tsx`, add `trip_id` to the params read from `useSearchParams` and pass as `tripId` prop:

```tsx
function TransportContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('pet_id') ?? undefined
  const conversationId = searchParams?.get('conversation_id') ?? undefined
  const tripId = searchParams?.get('trip_id') ?? undefined
  const providerId = searchParams?.get('provider_id') ?? undefined
  return (
    <TransportPage
      initialPetId={petId}
      conversationId={conversationId}
      tripId={tripId}
      providerId={providerId}
    />
  )
}
```

- [ ] **Step 2: Accept tripId and providerId props in TransportPage**

Update the `TransportPageProps` interface and component signature:

```tsx
interface TransportPageProps {
  initialPetId?: string
  conversationId?: string
  tripId?: string
  providerId?: string
}

export function TransportPage({ initialPetId, conversationId, tripId, providerId }: TransportPageProps) {
```

- [ ] **Step 3: Load specific trip when tripId is provided**

Replace the initial `useEffect` that calls `listTrips()` (lines 30-46). When `tripId` is present, call `getTrip(tripId)` instead:

```tsx
useEffect(() => {
  if (tripId) {
    getTrip(tripId).then(({ data }) => {
      if (!data) {
        setPageState('none')
        return
      }
      setTrip(data)
      setPageState(data.status as PageState)
    })
  } else {
    listTrips().then(({ data }) => {
      if (!data || data.length === 0) {
        setPageState('none')
        return
      }
      const active = data
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
      if (active) {
        setTrip(active)
        setPageState(active.status as PageState)
      } else {
        setPageState('none')
      }
    })
  }
}, [tripId])
```

Add `getTrip` to the import from `@/lib/api/transport` (it already exists in the module).

- [ ] **Step 4: Pass providerId to TransportCreationForm**

Update the `TransportCreationForm` usage (around line 133) to pass the new prop:

```tsx
<TransportCreationForm
  initialPetId={initialPetId}
  conversationId={conversationId}
  providerId={providerId}
  onTripCreated={(newTrip) => {
    setTrip(newTrip)
    setPageState('pending')
  }}
/>
```

- [ ] **Step 5: Update PageState type**

The `PageState` type (line 15) needs the new statuses:

```tsx
type PageState = 'loading' | 'none' | 'requested' | 'accepted' | 'picking_up' | 'in_transit' | 'completed' | 'cancelled'
```

Update the reconnecting banner condition (line 112) to match the new status names:

```tsx
{!connected && trip && (trip.status === 'requested' || trip.status === 'accepted' || trip.status === 'picking_up' || trip.status === 'in_transit') && (
```

- [ ] **Step 6: Commit**

```bash
git add app/transporte/page.tsx components/transport/transport-page.tsx
git commit -m "feat: add trip_id and provider_id query param support to transport page"
```

---

## Chunk 2: i18n Keys

### Task 4: Add transport flow i18n keys

**Files:**
- Modify: `public/locales/es/transport.json`
- Modify: `public/locales/en/transport.json`

- [ ] **Step 1: Add keys to Spanish locale**

Add these new sections to `public/locales/es/transport.json`:

```json
{
  "status": {
    "pending": "Pendiente",
    "requested": "Solicitado",
    "accepted": "Aceptado",
    "picking_up": "En camino a recoger",
    "in_transit": "En tránsito",
    "active": "En camino",
    "completed": "Completado",
    "cancelled": "Cancelado"
  },
  "toasts": {
    "submission_approved": "Tu solicitud para adoptar a {{pet_name}} fue aprobada",
    "submission_rejected": "Tu solicitud para adoptar a {{pet_name}} fue rechazada",
    "go_to_chat": "Ir al chat",
    "trip_accepted": "{{business_name}} aceptó el transporte",
    "trip_rejected": "El proveedor rechazó la solicitud de transporte",
    "trip_picking_up": "El conductor está en camino a recoger a {{pet_name}}",
    "trip_in_transit": "{{pet_name}} está en camino",
    "trip_completed": "Transporte completado — {{pet_name}} ha sido entregado/a",
    "trip_cancelled": "Transporte cancelado",
    "view_tracking": "Ver seguimiento"
  },
  "chat": {
    "request_transport": "Solicitar transporte"
  }
}
```

Keep existing keys (`steps`, `connection`, `drawer`, `form`, `actions`) unchanged — only add the new sections and merge the expanded `status` keys.

- [ ] **Step 2: Add keys to English locale**

Add the equivalent keys to `public/locales/en/transport.json`:

```json
{
  "status": {
    "pending": "Pending",
    "requested": "Requested",
    "accepted": "Accepted",
    "picking_up": "Picking up",
    "in_transit": "In transit",
    "active": "In transit",
    "completed": "Completed",
    "cancelled": "Cancelled"
  },
  "toasts": {
    "submission_approved": "Your adoption request for {{pet_name}} was approved",
    "submission_rejected": "Your adoption request for {{pet_name}} was rejected",
    "go_to_chat": "Go to chat",
    "trip_accepted": "{{business_name}} accepted the transport",
    "trip_rejected": "The provider rejected the transport request",
    "trip_picking_up": "The driver is on the way to pick up {{pet_name}}",
    "trip_in_transit": "{{pet_name}} is on the way",
    "trip_completed": "Transport completed — {{pet_name}} has been delivered",
    "trip_cancelled": "Transport cancelled",
    "view_tracking": "View tracking"
  },
  "chat": {
    "request_transport": "Request transport"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/locales/es/transport.json public/locales/en/transport.json
git commit -m "feat: add adoption flow and transport lifecycle i18n keys"
```

---

## Chunk 3: Notification Bell Navigation

### Task 5: Add metadata field and click navigation to notification bell

**Files:**
- Modify: `lib/api/notifications-api.ts`
- Modify: `components/dashboard/rescue-center/notification-bell.tsx`

- [ ] **Step 1: Add metadata to AppNotification type**

In `lib/api/notifications-api.ts`, update the `AppNotification` interface (lines 3-8):

```tsx
export interface AppNotification {
  id: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  metadata?: { link?: string; conversation_id?: string }
}
```

- [ ] **Step 2: Add router and navigation to notification bell**

In `components/dashboard/rescue-center/notification-bell.tsx`:

Add `useRouter` import at the top (from `next/navigation`):

```tsx
import { useRouter } from 'next/navigation'
```

Add the router hook inside the component (after the existing hooks around line 23):

```tsx
const router = useRouter()
```

- [ ] **Step 3: Update click handler to navigate**

Replace the `handleClickNotification` function (lines 69-76) with:

```tsx
const handleClickNotification = async (notification: AppNotification) => {
  const { error } = await markNotificationRead(notification.id)
  if (!error) {
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    )
  }
  if (notification.metadata?.link) {
    setOpen(false)
    router.push(notification.metadata.link)
  }
}
```

- [ ] **Step 4: Update the onClick in the notification list**

In the notification list render (line 113), change:

```tsx
onClick={() => handleClickNotification(n.id)}
```

To:

```tsx
onClick={() => handleClickNotification(n)}
```

- [ ] **Step 5: Pass metadata when creating notifications from WebSocket events**

Update the `submission_reviewed` subscriber (lines 52-60) to include metadata from the event data:

```tsx
const unsubReviewed = subscribe('submission_reviewed', (data: any) => {
  const n: AppNotification = {
    id: data.id || crypto.randomUUID(),
    title: data.title || 'Solicitud revisada',
    body: data.body || '',
    is_read: false,
    created_at: data.created_at || new Date().toISOString(),
    metadata: data.metadata,
  }
  setNotifications(prev => [n, ...prev])
})
```

- [ ] **Step 6: Commit**

```bash
git add lib/api/notifications-api.ts components/dashboard/rescue-center/notification-bell.tsx
git commit -m "feat: add metadata field to notifications and click-to-navigate in bell"
```

---

## Chunk 4: Toast Handler

### Task 6: Install sonner and create global toast handler

**Files:**
- Install: `sonner` package
- Modify: `app/layout.tsx` (add `<Toaster />`)
- Create: `components/transport/transport-toast-handler.tsx`

- [ ] **Step 1: Install sonner**

```bash
bun add sonner
```

Sonner is a lightweight toast library that works well with Next.js App Router. No shadcn toast wrapper needed.

- [ ] **Step 2: Add Toaster to root layout**

In `app/layout.tsx`, import and render `<Toaster />` from sonner. Place it as a sibling to the existing providers, inside the `<body>`:

```tsx
import { Toaster } from 'sonner'

// Inside the body, alongside existing providers:
<Toaster
  position="top-right"
  toastOptions={{
    className: 'bg-background border border-border text-foreground rounded-xl text-sm',
    duration: 10000,
  }}
/>
```

- [ ] **Step 3: Create TransportToastHandler component**

Create `components/transport/transport-toast-handler.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useWebSocket } from '@/lib/contexts/websocket-context'
import { useAuth } from '@/lib/contexts/auth-context'

export function TransportToastHandler() {
  const { subscribe } = useWebSocket()
  const { user } = useAuth()
  const { t } = useTranslation('transport')
  const router = useRouter()

  // submission_reviewed toasts (member sees these)
  useEffect(() => {
    if (user?.role !== 'member') return

    const unsub = subscribe('submission_reviewed', (data: any) => {
      const petName = data.pet_name || ''
      const status = data.status // 'approved' | 'rejected'
      const conversationId = data.conversation_id

      if (status === 'approved') {
        toast(t('toasts.submission_approved', { pet_name: petName }), {
          action: {
            label: t('toasts.go_to_chat'),
            onClick: () => router.push(conversationId ? `/chat?conversation_id=${conversationId}` : '/chat'),
          },
        })
      } else if (status === 'rejected') {
        const note = data.rejection_note
        toast(t('toasts.submission_rejected', { pet_name: petName }), {
          description: note || undefined,
        })
      }
    })

    return unsub
  }, [subscribe, user?.role, t, router])

  // trip_status_changed toasts (member + rescue_center see these)
  useEffect(() => {
    if (user?.role !== 'member' && user?.role !== 'rescue_center') return

    const unsub = subscribe('trip_status_changed', (data: any) => {
      const tripId = data.trip_id
      const status = data.status
      const petName = data.pet_name || ''
      const businessName = data.business_name || ''

      const actionButton = {
        label: t('toasts.view_tracking'),
        onClick: () => router.push(`/transporte?trip_id=${tripId}`),
      }

      switch (status) {
        case 'accepted':
          toast(t('toasts.trip_accepted', { business_name: businessName }), { action: actionButton })
          break
        case 'cancelled':
          toast(t('toasts.trip_rejected'))
          break
        case 'picking_up':
          toast(t('toasts.trip_picking_up', { pet_name: petName }), { action: actionButton })
          break
        case 'in_transit':
          toast(t('toasts.trip_in_transit', { pet_name: petName }), { action: actionButton })
          break
        case 'completed':
          toast(t('toasts.trip_completed', { pet_name: petName }))
          break
      }
    })

    return unsub
  }, [subscribe, user?.role, t, router])

  return null
}
```

- [ ] **Step 4: Mount TransportToastHandler in auth layout**

Find the layout file that wraps all authenticated pages (likely `app/(authenticated)/layout.tsx` or a shared layout). Mount `<TransportToastHandler />` inside it, after the WebSocket provider is available:

```tsx
import { TransportToastHandler } from '@/components/transport/transport-toast-handler'

// Inside the layout's return, as a sibling to {children}:
<TransportToastHandler />
{children}
```

If no shared authenticated layout exists, mount it in the `WebSocketProvider` consumer area or in `app/layout.tsx` conditionally.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lockb app/layout.tsx components/transport/transport-toast-handler.tsx
git commit -m "feat: add sonner toasts for submission review and trip status changes"
```

---

## Chunk 5: Chat ProviderPicker Integration

### Task 7: ProviderPicker modal in chat before transport redirect

**Files:**
- Modify: `components/chat/chat-message-thread.tsx`

- [ ] **Step 1: Add imports and state**

Add imports at the top of `chat-message-thread.tsx`:

```tsx
import { ProviderPicker } from '@/components/transport/provider-picker'
```

Inside the component, add state for the modal:

```tsx
const [showProviderPicker, setShowProviderPicker] = useState(false)
```

- [ ] **Step 2: Replace direct router.push with modal open**

Replace the `DropdownMenuItem` onClick (line 322):

```tsx
<DropdownMenuItem onClick={() => router.push(`/transporte?pet_id=${conversation.pet_id}&conversation_id=${conversation.id}`)}>
```

With:

```tsx
<DropdownMenuItem onClick={() => setShowProviderPicker(true)}>
```

- [ ] **Step 3: Use i18n key for button text**

Add `transport` namespace to the `useTranslation` call. Currently the component uses `useTranslation('common')` or similar. Either add a second `useTranslation('transport')` call or use the namespace prefix syntax.

Replace the hardcoded text (line 324):

```
Solicitar transporte
```

With:

```tsx
{t('chat.request_transport', { ns: 'transport' })}
```

Or if using a separate hook:

```tsx
const { t: tTransport } = useTranslation('transport')
// ...
{tTransport('chat.request_transport')}
```

- [ ] **Step 4: Render ProviderPicker modal**

Add the modal render at the end of the component's return, before the closing `</div>`:

```tsx
{showProviderPicker && conversation.pet_id && (
  <ProviderPicker
    open={showProviderPicker}
    onClose={() => setShowProviderPicker(false)}
    onSelect={(providerId) => {
      setShowProviderPicker(false)
      router.push(
        `/transporte?pet_id=${conversation.pet_id}&conversation_id=${conversation.id}&provider_id=${providerId}`
      )
    }}
  />
)}
```

Note: `ProviderPicker` is created by the Business Dashboard plan. It accepts `open`, `onClose`, and `onSelect(providerId: string)` props.

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-message-thread.tsx
git commit -m "feat: add ProviderPicker modal in chat before transport redirect"
```

---

## Chunk 6: Transport Creation Form — Provider Pre-selection

### Task 8: Read provider_id in transport creation form

**Files:**
- Modify: `components/transport/transport-creation-form.tsx`

- [ ] **Step 1: Accept providerId prop**

Update the `TransportCreationFormProps` interface:

```tsx
interface TransportCreationFormProps {
  initialPetId?: string
  conversationId?: string
  providerId?: string
  onTripCreated: (trip: Trip) => void
}
```

Update the destructured props:

```tsx
export function TransportCreationForm({ initialPetId, conversationId, providerId, onTripCreated }: TransportCreationFormProps) {
```

- [ ] **Step 2: Include target_driver_id and pickup fields in requestTrip call**

Update the `handleSubmit` function's `requestTrip` call (lines 103-110). Replace with:

```tsx
const { data, error } = await requestTrip({
  pet_id: selectedPetId,
  target_driver_id: providerId || '',
  pickup_address: pickupAddress,
  pickup_lat: pickupCoords.lat,
  pickup_lng: pickupCoords.lng,
  stops: [
    { address: pickupAddress, lat: pickupCoords.lat, lng: pickupCoords.lng },
    { address: dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
  ],
  ...(conversationId ? { conversation_id: conversationId } : {}),
})
```

- [ ] **Step 3: Show ProviderPicker if no providerId**

If `providerId` is not provided (user navigated directly to `/transporte` without going through chat), add a ProviderPicker step before the form. Add state and conditional rendering:

```tsx
const [selectedProviderId, setSelectedProviderId] = useState(providerId || '')
const [showProviderStep, setShowProviderStep] = useState(!providerId)
```

If `showProviderStep` is true, render `ProviderPicker` inline instead of the form:

```tsx
if (showProviderStep) {
  return (
    <div className="absolute mx-170 mb-90 bottom-4 left-4 right-4 z-20">
      <div className="bg-primary/95 backdrop-blur-xl rounded-2xl border border-pop-750 p-4">
        <ProviderPicker
          open={true}
          onClose={() => {}} // No close action — must pick a provider
          onSelect={(id) => {
            setSelectedProviderId(id)
            setShowProviderStep(false)
          }}
        />
      </div>
    </div>
  )
}
```

Then use `selectedProviderId` in the `requestTrip` call instead of `providerId`.

- [ ] **Step 4: Commit**

```bash
git add components/transport/transport-creation-form.tsx
git commit -m "feat: support provider pre-selection in transport creation form"
```

---

## Chunk 7: Verification

### Task 9: End-to-end verification

- [ ] **Step 1: Test the full flow manually**

Walk through the complete flow described in the spec:

1. **WebSocket connection** — Log in as `business` role, verify WebSocket connects (check browser dev tools Network tab for WS connection)
2. **Notification navigation** — Click a notification with `metadata.link` — verify it navigates and closes the sheet
3. **Toast on submission_reviewed** — Trigger a `submission_reviewed` WebSocket event (from backend or mock) — verify toast appears with correct text, action button navigates to chat
4. **ProviderPicker in chat** — Open a chat with a `pet_id`, click "+" menu, click "Solicitar transporte" — verify ProviderPicker modal opens instead of direct redirect
5. **Provider selection redirect** — Select a provider — verify redirect to `/transporte?pet_id=...&conversation_id=...&provider_id=...`
6. **Transport page with trip_id** — Navigate to `/transporte?trip_id={some-id}` — verify it loads that specific trip
7. **Trip lifecycle toasts** — Trigger `trip_status_changed` events for each status — verify correct toast messages appear with action buttons

- [ ] **Step 2: Fix any issues found**

Address bugs or visual issues discovered during testing.

- [ ] **Step 3: Final commit if needed**

```bash
git add -A
git commit -m "fix: polish adoption transport flow integration"
```
