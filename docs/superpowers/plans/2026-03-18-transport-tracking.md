# Transport Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/transporte` page with full-screen Leaflet map, floating TransportStepper, and bottom drawer for real-time pet transport tracking.

**Architecture:** Standalone authenticated page at `/transporte`. Full-screen map (Leaflet + CartoDB Dark Matter tiles) with floating UI elements: a TransportStepper card at the top and a Vaul bottom drawer that peeks with status/ETA and expands to show stop details + cancel. Trip state managed via REST API + WebSocket events.

**Tech Stack:** React 19, Leaflet + react-leaflet, Vaul (shadcn Drawer), motion/react, react-i18next, Font Awesome, WebSocket

**Spec:** `docs/superpowers/specs/2026-03-18-transport-tracking-design.md`

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Create | `lib/api/transport.ts` | API module: types + CRUD functions |
| Create | `public/locales/es/transport.json` | Spanish translations |
| Create | `public/locales/en/transport.json` | English translations |
| Modify | `lib/i18n/index.ts` | Register transport namespace |
| Modify | `lib/i18n/config.ts` | Add transport to namespace types |
| Create | `components/transport/transport-page.tsx` | Page container: state machine, data fetching, WebSocket subscriptions |
| Create | `components/transport/transport-stepper.tsx` | Floating horizontal step indicator (forked from Stepper.tsx) |
| Create | `components/transport/transport-map.tsx` | Leaflet map wrapper (dynamic import, ssr: false) |
| Create | `components/transport/transport-drawer.tsx` | Bottom drawer: peek (status/ETA) + expanded (stops, payment placeholder, cancel) |
| Create | `components/transport/transport-creation-form.tsx` | Trip creation form: address inputs, pet selector, submit |
| Create | `app/transporte/page.tsx` | Route entry point |
| Create | `app/transporte/layout.tsx` | ProtectedRoute wrapper |

---

## Task 1: Install Dependencies + i18n Setup

**Files:**
- Modify: `package.json` (via bun add)
- Create: `public/locales/es/transport.json`
- Create: `public/locales/en/transport.json`
- Modify: `lib/i18n/index.ts`
- Modify: `lib/i18n/config.ts`

- [ ] **Step 1: Install leaflet and react-leaflet**

```bash
bun add leaflet react-leaflet @types/leaflet
```

- [ ] **Step 2: Create Spanish translation file**

Create `public/locales/es/transport.json`:
```json
{
  "status": {
    "pending": "Pendiente",
    "active": "En camino",
    "completed": "Completado",
    "cancelled": "Cancelado"
  },
  "steps": {
    "pickup": "Recogida",
    "in_transit": "En camino",
    "delivered": "Entregado",
    "searching": "Buscando conductor"
  },
  "connection": {
    "reconnecting": "Reconectando..."
  },
  "drawer": {
    "pet_on_way": "Tu mascota está en camino",
    "searching_driver": "Buscando conductor...",
    "delivery_complete": "Entrega completada",
    "trip_cancelled": "Viaje cancelado",
    "stops": "Paradas",
    "eta": "ETA: ~{{minutes}} min",
    "stop_of": "Parada {{current}} de {{total}}",
    "payment": "Pago — próximamente",
    "completed_label": "Completado"
  },
  "form": {
    "pickup_address": "Dirección de recogida",
    "dropoff_address": "Dirección de entrega",
    "select_pet": "Seleccionar mascota",
    "request_transport": "Solicitar transporte",
    "address_not_found": "No se encontró la dirección",
    "error_creating": "Error al crear el viaje"
  },
  "actions": {
    "cancel_trip": "Cancelar viaje",
    "cancel_confirm": "¿Seguro que deseas cancelar este viaje?",
    "cancel_confirm_action": "Sí, cancelar",
    "new_trip": "Solicitar nuevo viaje"
  }
}
```

- [ ] **Step 3: Create English translation file**

Create `public/locales/en/transport.json` with equivalent English keys.

- [ ] **Step 4: Register transport namespace in i18n**

In `lib/i18n/index.ts`, import the new JSON files and add `transport` to the resources object for both `es` and `en` locales. Follow the same pattern as the existing `pets` namespace import.

In `lib/i18n/config.ts`, add `'transport'` to the namespace list type.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock public/locales/es/transport.json public/locales/en/transport.json lib/i18n/index.ts lib/i18n/config.ts
git commit -m "feat(transport): install leaflet deps and add i18n namespace"
```

---

## Task 2: API Module — `lib/api/transport.ts`

**Files:**
- Create: `lib/api/transport.ts`

- [ ] **Step 1: Create the transport API module with types and all functions**

Create `lib/api/transport.ts`. Follow the exact pattern from `lib/api/chat.ts`:
- Import `apiClient` from `./client`
- Define interfaces: `TripStatus`, `TripStop`, `Trip`, `DriverLocation`, `RequestTripPayload`
- Implement functions, all returning `{ data: T | null, error: string | null }`:

```typescript
import { apiClient } from './client'

export type TripStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface TripStop {
  id: string
  address: string
  lat: number
  lng: number
  position: number
  completed_at: string | null
}

export interface Trip {
  id: string
  requester_id: string
  driver_id: string | null
  pet_id: string
  status: TripStatus
  stops: TripStop[]
  created_at: string
  updated_at: string
}

export interface DriverLocation {
  trip_id: string
  lat: number
  lng: number
  eta_minutes: number | null
}

interface RequestTripPayload {
  pet_id: string
  stops: { address: string; lat: number; lng: number }[]
}

export async function requestTrip(payload: RequestTripPayload): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/transport/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al crear el viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function listTrips(): Promise<{ data: Trip[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/transport')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar viajes' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function cancelTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/cancel`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cancelar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// --- Driver-side functions (future phase, included for API completeness) ---

export async function acceptTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/accept`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al aceptar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function updateTripStatus(id: string, status: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar estado' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function completeStop(tripId: string, stopId: string): Promise<{ data: null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${tripId}/stops/${stopId}/complete`, { method: 'PATCH' })
    if (!res.ok) { const json = await res.json(); return { data: null, error: json.error || 'Error al completar parada' } }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/transport.ts
git commit -m "feat(transport): add transport API module with types"
```

---

## Task 3: Route + Page Skeleton

**Files:**
- Create: `app/transporte/layout.tsx`
- Create: `app/transporte/page.tsx`
- Create: `components/transport/transport-page.tsx`

- [ ] **Step 1: Create the layout with ProtectedRoute**

Create `app/transporte/layout.tsx`:
```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function TransporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['member', 'rescue_center']}>
      {children}
    </ProtectedRoute>
  )
}
```

- [ ] **Step 2: Create the page entry point**

Create `app/transporte/page.tsx`. Follow the pattern from `app/adopt/page.tsx` — use `Suspense` + `useSearchParams` to read optional `?pet_id=` query param:
```tsx
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TransportPage } from '@/components/transport/transport-page'

function TransportContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('pet_id') ?? undefined
  return <TransportPage initialPetId={petId} />
}

export default function Page() {
  return (
    <Suspense>
      <TransportContent />
    </Suspense>
  )
}
```

- [ ] **Step 3: Create the page container skeleton**

Create `components/transport/transport-page.tsx` with basic state management — a loading spinner for now. Import Leaflet CSS here. Define the state machine (loading/none/pending/active/completed/cancelled). Fetch trips on mount via `listTrips()`. Select the most recent non-completed trip, or show creation state if none.

The component structure:
```tsx
'use client'

import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Trip, listTrips } from '@/lib/api/transport'
import { useWebSocket } from '@/lib/contexts/websocket-context'

type PageState = 'loading' | 'none' | 'pending' | 'active' | 'completed' | 'cancelled'

interface TransportPageProps {
  initialPetId?: string
}

export function TransportPage({ initialPetId }: TransportPageProps) {
  const { t } = useTranslation('transport')
  const { subscribe } = useWebSocket()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [trip, setTrip] = useState<Trip | null>(null)

  useEffect(() => {
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
  }, [])

  // WebSocket subscriptions added in Task 7

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Map, Stepper, Drawer, and Form will be added in subsequent tasks */}
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {pageState === 'none' ? 'Trip creation form goes here' : `Trip state: ${pageState}`}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify the route loads in the browser**

Navigate to `http://localhost:3000/transporte` — should show the loading spinner, then the placeholder text. If not authenticated, should redirect to `/auth/login`.

- [ ] **Step 5: Commit**

```bash
git add app/transporte/layout.tsx app/transporte/page.tsx components/transport/transport-page.tsx
git commit -m "feat(transport): add /transporte route with page skeleton"
```

---

## Task 4: Transport Map Component

**Files:**
- Create: `components/transport/transport-map.tsx`
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Create the Leaflet map wrapper**

Create `components/transport/transport-map.tsx`. This component renders the CartoDB Dark Matter tile layer, stop markers (custom divIcons), driver marker, and a dashed polyline. It must NOT be imported directly — only via `next/dynamic`.

```tsx
'use client'

import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { TripStop, DriverLocation } from '@/lib/api/transport'

// Santo Domingo default center
const DEFAULT_CENTER: [number, number] = [18.4861, -69.9312]
const DEFAULT_ZOOM = 13

// Custom marker icons using divIcon (avoids Leaflet's default icon path issues)
function createStopIcon(color: string, completed: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0d1117;opacity:${completed ? 0.5 : 1}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;border-radius:50%;background:var(--color-pop-500, #2dd4bf);border:3px solid white;box-shadow:0 0 12px rgba(45,212,191,0.5)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

// Auto-fit bounds when stops/driver change
function FitBounds({ stops, driverLocation }: { stops: TripStop[]; driverLocation: DriverLocation | null }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = stops.map(s => [s.lat, s.lng])
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng])
    if (points.length > 0) {
      map.fitBounds(points as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 15 })
    }
  }, [map, stops, driverLocation])
  return null
}

interface TransportMapProps {
  stops: TripStop[]
  driverLocation: DriverLocation | null
  tripStatus: string | null
}

export default function TransportMap({ stops, driverLocation, tripStatus }: TransportMapProps) {
  const positions: [number, number][] = stops.map(s => [s.lat, s.lng])

  return (
    <MapContainer
      center={stops.length > 0 ? [stops[0].lat, stops[0].lng] : DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full z-0"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

      {stops.map((stop, i) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={createStopIcon(
            i === stops.length - 1 ? '#f97316' : 'var(--color-pop-500, #2dd4bf)',
            !!stop.completed_at
          )}
        />
      ))}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon} />
      )}

      {positions.length >= 2 && (
        <Polyline positions={positions} pathOptions={{ color: '#2dd4bf', dashArray: '6,4', opacity: 0.6, weight: 2.5 }} />
      )}

      <FitBounds stops={stops} driverLocation={driverLocation} />
    </MapContainer>
  )
}
```

- [ ] **Step 2: Dynamically import the map in transport-page.tsx**

In `components/transport/transport-page.tsx`, add:
```tsx
import dynamic from 'next/dynamic'

const TransportMap = dynamic(() => import('./transport-map'), { ssr: false })
```

Replace the placeholder div in the return with:
```tsx
<TransportMap
  stops={trip?.stops ?? []}
  driverLocation={null}
  tripStatus={trip?.status ?? null}
/>
```

- [ ] **Step 3: Verify the map renders**

Navigate to `http://localhost:3000/transporte`. Should see a full-screen dark map centered on Santo Domingo.

- [ ] **Step 4: Commit**

```bash
git add components/transport/transport-map.tsx components/transport/transport-page.tsx
git commit -m "feat(transport): add Leaflet map with dark tiles and custom markers"
```

---

## Task 5: TransportStepper Component

**Files:**
- Create: `components/transport/transport-stepper.tsx`
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Create TransportStepper**

Create `components/transport/transport-stepper.tsx`. This is a compact horizontal step indicator — NOT a copy of the full Stepper.tsx wizard. It's a simpler, purpose-built component inspired by the Stepper's visual style:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { TripStop } from '@/lib/api/transport'

interface TransportStepperProps {
  stops: TripStop[]
  status: string
}

export function TransportStepper({ stops, status }: TransportStepperProps) {
  const { t } = useTranslation('transport')

  // Determine which step is active based on completed stops
  const completedCount = stops.filter(s => s.completed_at).length
  const isCancelled = status === 'cancelled'
  const isCompleted = status === 'completed'

  return (
    <div className="absolute top-3 left-4 right-4 z-20 bg-sidebar/92 backdrop-blur-xl rounded-2xl border border-border px-4 py-2.5">
      <div className="flex items-center justify-center gap-3">
        {stops.map((stop, i) => {
          const isStopCompleted = !!stop.completed_at || isCompleted
          const isActive = !isStopCompleted && i === completedCount
          const isPending = !isStopCompleted && !isActive

          return (
            <div key={stop.id} className="flex items-center gap-3">
              {i > 0 && (
                <div className={`w-6 h-0.5 ${isStopCompleted || isActive ? 'bg-pop-500' : 'bg-muted'}`} />
              )}
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCancelled ? 'bg-muted text-muted-foreground' :
                  isStopCompleted ? 'bg-pop-500 text-background' :
                  isActive ? 'bg-pop-500 text-background' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isStopCompleted ? <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> : i + 1}
                </div>
                <span className={`text-[10px] hidden sm:inline ${
                  isCancelled ? 'text-muted-foreground line-through' :
                  isActive ? 'text-foreground font-semibold' :
                  'text-muted-foreground'
                }`}>
                  {i === 0 ? t('steps.pickup') : i === stops.length - 1 ? t('steps.delivered') : t('steps.in_transit')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into transport-page.tsx**

Import `TransportStepper` and render it above the map when `pageState` is not `'none'` and not `'loading'`:
```tsx
{trip && pageState !== 'none' && (
  <TransportStepper stops={trip.stops} status={trip.status} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/transport/transport-stepper.tsx components/transport/transport-page.tsx
git commit -m "feat(transport): add floating TransportStepper component"
```

---

## Task 6: Transport Drawer Component

**Files:**
- Create: `components/transport/transport-drawer.tsx`
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Create the bottom drawer**

Create `components/transport/transport-drawer.tsx` using the existing shadcn Drawer (Vaul). The drawer has a snap point for the peek state and full expansion:

The component receives: `trip`, `driverLocation`, `onCancel` callback.

**Collapsed (peek):** Status message + ETA + badge.
**Expanded:** Stop list with addresses/status, payment placeholder card, cancel button with AlertDialog confirmation.

Key implementation details:
- Use `Drawer` with `snapPoints={[0.15, 0.65]}` for peek vs expanded
- Stop list: iterate `trip.stops`, show address, completed/active/pending state
- Payment: static placeholder card with "Pago — próximamente" text
- Cancel: red outline button, opens `AlertDialog` for confirmation, calls `onCancel`
- Use `useTranslation('transport')` for all strings

- [ ] **Step 2: Wire into transport-page.tsx**

Import `TransportDrawer` and render it when a trip exists. Pass an `onCancel` handler that calls `cancelTrip(trip.id)` and updates state.

- [ ] **Step 3: Verify drawer peek and expand behavior**

Navigate to `/transporte`. If there's an active trip, the drawer should peek at the bottom. Swiping up should expand it.

- [ ] **Step 4: Commit**

```bash
git add components/transport/transport-drawer.tsx components/transport/transport-page.tsx
git commit -m "feat(transport): add bottom drawer with peek/expand states"
```

---

## Task 7: Trip Creation Form

**Files:**
- Create: `components/transport/transport-creation-form.tsx`
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Create the trip creation form**

Create `components/transport/transport-creation-form.tsx`:
- Pickup address input field
- Dropoff address input field
- Pet selector dropdown (import `listUserPets` from `lib/api/user-pets.ts` for members, import `listPets` from `lib/api/pets.ts` for RCs; use `useAuth()` to determine role)
- "Solicitar transporte" submit button
- Geocoding via Nominatim: `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1` with `User-Agent: Pelu-App/1.0` header and 500ms debounce
- Inline error messages for geocoding failures and API errors
- If `initialPetId` is provided, pre-select that pet
- On submit: geocode both addresses, call `requestTrip()`, transition to pending state via `onTripCreated` callback

Style: card with `rounded-2xl`, positioned at the bottom of the viewport similar to the drawer's visual placement. Use `bg-sidebar/95 backdrop-blur-xl` to match the floating UI aesthetic.

- [ ] **Step 2: Wire into transport-page.tsx**

Show `TransportCreationForm` when `pageState === 'none'`. Pass `initialPetId` and `onTripCreated` callback that sets the new trip and transitions to `'pending'` state.

- [ ] **Step 3: Verify form renders and submits**

Navigate to `/transporte` with no active trips. Form should appear. Fill in addresses and select a pet. Submit should call the API (will fail if backend isn't running — that's OK, verify the request is made in Network tab).

- [ ] **Step 4: Commit**

```bash
git add components/transport/transport-creation-form.tsx components/transport/transport-page.tsx
git commit -m "feat(transport): add trip creation form with geocoding"
```

---

## Task 8: WebSocket Integration

**Files:**
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Add WebSocket subscriptions for transport events**

In `transport-page.tsx`, add `useEffect` hooks that subscribe to the three transport events using the existing `useWebSocket().subscribe()`:

```tsx
// Driver location updates
useEffect(() => {
  const unsub = subscribe('driver_location', (data: any) => {
    if (trip && data.trip_id === trip.id) {
      setDriverLocation({
        trip_id: data.trip_id,
        lat: data.lat,
        lng: data.lng,
        eta_minutes: data.eta_minutes,
      })
    }
  })
  return unsub
}, [subscribe, trip])

// Trip status changes
useEffect(() => {
  const unsub = subscribe('trip_status_changed', (data: any) => {
    if (trip && data.trip_id === trip.id) {
      setTrip(prev => prev ? { ...prev, status: data.status } : null)
      setPageState(data.status as PageState)
    }
  })
  return unsub
}, [subscribe, trip])

// Stop completed
useEffect(() => {
  const unsub = subscribe('stop_completed', (data: any) => {
    if (trip && data.trip_id === trip.id) {
      setTrip(prev => {
        if (!prev) return null
        return {
          ...prev,
          stops: prev.stops.map(s =>
            s.id === data.stop_id ? { ...s, completed_at: data.completed_at } : s
          ),
        }
      })
    }
  })
  return unsub
}, [subscribe, trip])
```

Also add `driverLocation` state: `const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)` and pass it to `TransportMap` and `TransportDrawer`.

Add a reconnection banner that shows when WebSocket is disconnected during an active trip:
```tsx
const { connected } = useWebSocket()
// In the render, above the map:
{!connected && trip && (trip.status === 'pending' || trip.status === 'active') && (
  <div className="absolute top-16 left-4 right-4 z-30 bg-yellow-500/90 text-background text-center text-xs font-medium py-1.5 rounded-xl">
    {t('connection.reconnecting')}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add components/transport/transport-page.tsx
git commit -m "feat(transport): add WebSocket subscriptions for real-time tracking"
```

---

## Task 9: Final Assembly + Polish

**Files:**
- Modify: `components/transport/transport-page.tsx`

- [ ] **Step 1: Assemble all components in the page**

Ensure `transport-page.tsx` renders the complete layout for each state:
- **Loading:** Spinner
- **None:** Map (Santo Domingo default) + CreationForm at bottom
- **Pending:** Map (stops pinned) + Stepper + Drawer (searching)
- **Active:** Map (driver moving) + Stepper + Drawer (tracking)
- **Completed:** Map (final route) + Stepper (all done) + Drawer (complete)
- **Cancelled:** Map + Stepper (greyed) + Drawer (cancelled) + "Solicitar nuevo viaje" button that resets state to `'none'`:
```tsx
{pageState === 'cancelled' && (
  <button
    onClick={() => { setTrip(null); setPageState('none') }}
    className="absolute bottom-24 left-4 right-4 z-20 bg-pop-500 text-background py-3 rounded-xl font-semibold text-sm"
  >
    {t('actions.new_trip')}
  </button>
)}
```
- **Completed:** Map + Stepper (all done) + Drawer (complete) + rating/review placeholder (a muted card with "Calificación — próximamente" text, similar to the payment placeholder)

Add the map dim overlay when drawer is expanded:
```tsx
{drawerExpanded && (
  <div className="absolute inset-0 bg-black/40 z-10 transition-opacity" />
)}
```

- [ ] **Step 2: Verify all states visually**

Test each page state by navigating to `/transporte` with different trip data. If no backend is running, temporarily mock the `listTrips` response to test each state.

- [ ] **Step 3: Commit**

```bash
git add components/transport/transport-page.tsx
git commit -m "feat(transport): assemble full transport tracking page"
```

---

## Task 10: Documentation Update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Add `/transporte` to the App Router Routes table. Add `transport-page.tsx`, `transport-stepper.tsx`, `transport-map.tsx`, `transport-drawer.tsx` to Key Components. Confirm `lib/api/transport.ts` is listed (already added as "planned" — update to remove "planned" label).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with transport tracking components"
```
