# Transport Tracking — Frontend Design Spec

**Date:** 2026-03-18
**Status:** Draft
**Backend:** Complete — REST endpoints + WebSocket events ready in `pelu-api`

---

## Overview

A standalone transport tracking page (`/transporte`) where members and rescue centers can create trips and track pet transport in real time. Uses Leaflet + OpenStreetMap for the map.

The flow: adoption approved → chat opens → either party navigates to `/transporte` → creates a trip with pickup/dropoff addresses → driver accepts → both parties track live on the map.

---

## Route

| Route | Component | Access |
|---|---|---|
| `/transporte` | `components/transport/transport-page.tsx` | Authenticated (`member`, `rescue_center`) via `ProtectedRoute` |

---

## Layout: Full-Screen Map + Floating UI

The map fills the entire viewport. UI elements float on top:

1. **TransportStepper** — floating card at the top with `rounded-2xl`, semi-transparent backdrop blur. Shows trip progress steps (e.g., Recogida → En camino → Entregado). Copied from `Stepper.tsx` into `TransportStepper.tsx` — a standalone copy that can be modified independently without affecting the onboarding wizard. The original Stepper is a multi-step wizard with slide transitions; TransportStepper is a compact horizontal indicator with no content panels.

2. **Bottom Drawer** — slides up from the bottom with `rounded-t-2xl`. Uses the shadcn Drawer component (Vaul). Two states:
   - **Collapsed (peek):** Shows status message ("Tu mascota está en camino"), ETA, and a status badge. Always visible. Drag handle at top hints expansion.
   - **Expanded:** Slides up to reveal full stop list and cancel button. Map dims behind with an overlay. Payment section renders as a placeholder card ("Pago — próximamente") since payment integration is Phase 7.

3. **Map** — Leaflet with CartoDB Dark Matter tiles (free, matches Pelú dark aesthetic). Shows driver pin (animated, glowing), stop markers (pickup = pop color, dropoff = orange), and a dashed route line connecting stops. Uses custom marker icons (divIcon) to avoid Leaflet's default icon path issues in bundled environments.

---

## Page States

### 0. Loading
- Spinner centered on map while `GET /api/v1/transport` is in flight
- TransportStepper and drawer hidden

### 1. No Active Trip
- Map centered on Santo Domingo (default: 18.4861, -69.9312)
- TransportStepper hidden
- Bottom drawer replaced by a **trip creation form** card (bottom-aligned):
  - Pickup address input (text, geocoded to coordinates)
  - Dropoff address input (text, geocoded to coordinates)
  - Pet selector (dropdown of user's pets or approved adoptions)
  - "Solicitar transporte" button
- On submit: `POST /api/v1/transport/request` → transitions to Pending state
- **Error:** If request fails, show inline error message below the submit button

### 2. Pending
- TransportStepper shows step 1 highlighted ("Buscando conductor")
- Map shows pickup + dropoff pins
- Drawer peek: "Buscando conductor..." with a spinner
- Drawer expanded: stop list, cancel button
- Listens for WebSocket `trip_status_changed` → transitions to Active when a driver accepts

### 3. Active (En camino)
- TransportStepper progresses through stops as they complete
- Map shows:
  - Driver pin with real-time position updates (WebSocket `driver_location`)
  - Completed stops dimmed, next stop highlighted
  - Dashed route line
- Drawer peek: "Tu mascota está en camino" + ETA to next stop
- Drawer expanded: full stop list with per-stop status (completed/in-progress/pending), cancel button
- WebSocket `stop_completed` events update the stop list and stepper
- **WebSocket disconnect:** Show a "Reconectando..." banner at top of map. WebSocketProvider handles auto-reconnect.

### 4. Completed
- TransportStepper all steps checked
- Map shows final route with all stops completed
- Drawer peek: "Entrega completada" with a checkmark
- Drawer expanded: completed stop list, no cancel button
- Future: rating/review placeholder area

### 5. Cancelled
- TransportStepper greyed out
- Drawer peek: "Viaje cancelado"
- "Solicitar nuevo viaje" button to return to creation state

---

## Components

### `transport-page.tsx`
Page container. Manages trip state (loading/none/pending/active/completed/cancelled). Fetches trips on mount via `GET /api/v1/transport`. If multiple trips exist, displays the most recent non-completed trip (by `updated_at`). If all trips are completed/cancelled, shows the creation form. Subscribes to WebSocket events for real-time updates.

### `TransportStepper.tsx`
Copied from `Stepper.tsx` as an independent component. Horizontal step indicator adapted for transport:
- Steps derived from trip stops (not hardcoded)
- Compact, single-row layout (no slide transitions or content panels)
- Floating card style: `bg-sidebar/92 backdrop-blur-xl rounded-2xl border border-border`
- Step states: completed (pop color + checkmark), active (pop color + number), pending (muted)

### `transport-map.tsx`
Leaflet map wrapper. Must be dynamically imported with `next/dynamic` and `ssr: false`:
- Uses `react-leaflet` with CartoDB Dark Matter tile layer (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
- Custom divIcon markers for driver (glowing pop-colored dot), pickup (pop), dropoff (orange)
- Dashed polyline connecting stops
- Auto-fits bounds to show all stops + driver
- Receives driver position, stops, and trip status as props

### `transport-drawer.tsx`
Bottom drawer using shadcn Drawer (Vaul). **Setup:** Run `npx shadcn@latest add drawer` to add the component wrapper.
- **Collapsed:** status text + ETA + badge. Tap/swipe up to expand.
- **Expanded:**
  - Stop list with addresses and completion status
  - Payment placeholder card ("Pago — próximamente", deferred to Phase 7)
  - Cancel trip button (red outline, requires confirmation via AlertDialog)
- Drag handle at top for swipe gesture

### `transport-creation-form.tsx`
Shown when no active trip exists:
- Pickup address input
- Dropoff address input
- Pet selector dropdown:
  - For `member` role: fetches from `GET /api/v1/user-pets` (personal pets)
  - For `rescue_center` role: fetches from `GET /api/v1/pets` (RC-scoped pets)
- Submit button → `POST /api/v1/transport/request`
- Address geocoding via Nominatim (see Geocoding section)
- **Error states:** Inline error below submit on API failure. Inline warning below address input if geocoding returns no results.
- **Pre-fill:** If navigated from chat with query params (`?pet_id=xxx`), pre-select the pet.

### `lib/api/transport.ts` (new file)
New API module to be created. All paths relative to `NEXT_PUBLIC_API_URL`:
- `requestTrip(data)` → `POST /api/v1/transport/request`
- `acceptTrip(id)` → `PATCH /api/v1/transport/{id}/accept`
- `updateTripStatus(id, status)` → `PATCH /api/v1/transport/{id}/status`
- `completeStop(tripId, stopId)` → `PATCH /api/v1/transport/{id}/stops/{stopId}/complete`
- `cancelTrip(id)` → `PATCH /api/v1/transport/{id}/cancel`
- `getTrip(id)` → `GET /api/v1/transport/{id}`
- `listTrips()` → `GET /api/v1/transport`
- All use `apiClient()` with `{ data, error }` return pattern

---

## TypeScript Types

Defined in `lib/api/transport.ts`:

```typescript
type TripStatus = 'pending' | 'active' | 'completed' | 'cancelled'

interface TripStop {
  id: string
  address: string
  lat: number
  lng: number
  position: number
  completed_at: string | null
}

interface Trip {
  id: string
  requester_id: string
  driver_id: string | null
  pet_id: string
  status: TripStatus
  stops: TripStop[]
  created_at: string
  updated_at: string
}

interface DriverLocation {
  trip_id: string
  lat: number
  lng: number
  eta_minutes: number | null
}
```

---

## WebSocket Integration

Subscribe to transport events via existing `useWebSocket()`:

| Event (server→client) | Action |
|---|---|
| `driver_location` | Update driver pin position on map + ETA in drawer |
| `trip_status_changed` | Update trip state, stepper, drawer |
| `stop_completed` | Mark stop as done in drawer + stepper |
| `trip_requested` | (For drivers, future phase) |

**Payload structure** (transport events use flat payloads, not nested like `new_message`):
- `driver_location`: `{ trip_id, lat, lng, eta_minutes }`
- `trip_status_changed`: `{ trip_id, status, updated_at }`
- `stop_completed`: `{ trip_id, stop_id, completed_at }`

Client→server messages (for driver role, future phase):
- `location_update` — driver sends GPS coordinates
- `trip_status_update` — driver changes trip status
- `stop_completed` — driver marks a stop done

---

## Dependencies

| Package | Purpose |
|---|---|
| `leaflet` | Map rendering |
| `react-leaflet` | React bindings for Leaflet |
| `@types/leaflet` | TypeScript definitions |

Install: `bun add leaflet react-leaflet @types/leaflet`

Leaflet CSS: Import `leaflet/dist/leaflet.css` at the top of `transport-page.tsx` (the parent that loads the dynamic map component). This keeps it scoped to the transport route without needing global CSS.

**SSR note:** Leaflet requires `window`. Use `next/dynamic` with `ssr: false` for `transport-map.tsx`.

**Electron note:** Nominatim geocoding is called from the client. In the Electron production build (loaded from `file://`), cross-origin requests may behave differently. If this becomes an issue, geocoding should be proxied through the backend. Flag as a known risk for testing during Electron builds.

---

## Internationalization

Create new `transport` namespace:
- `public/locales/es/transport.json` — Spanish translations (primary)
- `public/locales/en/transport.json` — English translations
- Register in `lib/i18n/index.ts` and `lib/i18n/config.ts`

Key translation keys:
- `status.pending`, `status.active`, `status.completed`, `status.cancelled`
- `steps.pickup`, `steps.in_transit`, `steps.delivered`
- `drawer.pet_on_way`, `drawer.searching_driver`, `drawer.delivery_complete`, `drawer.trip_cancelled`
- `form.pickup_address`, `form.dropoff_address`, `form.select_pet`, `form.request_transport`
- `actions.cancel_trip`, `actions.new_trip`

---

## Design Tokens

Follow existing Pelú design system:
- **Cards:** `rounded-2xl` for all cards (stepper, drawer, form)
- **Buttons:** `rounded-xl`
- **Colors:** Pop color (`--color-pop-*`) for active states and driver pin. Orange (`#f97316`) for dropoff. Muted for pending/inactive.
- **Backdrop:** `backdrop-blur-xl bg-sidebar/92` for floating elements over the map
- **Icons:** Font Awesome only — `faTruck`, `faLocationDot`, `faCircleCheck`, `faXmark`
- **Typography:** Use `transport` i18n namespace for all UI strings

---

## Geocoding

Address-to-coordinates conversion uses **Nominatim** (OpenStreetMap's free geocoding API):
- `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1`
- Free, no API key required. Must include a custom `User-Agent` header (`Pelu-App/1.0`).
- Rate limit: 1 request/second — debounce address inputs (500ms minimum)
- Returns `lat`/`lon` which are sent to the backend with the trip request
- **No results:** Show inline warning "No se encontró la dirección" below the input
- **Future consideration:** If usage grows, proxy geocoding through the backend to centralize rate limiting and avoid CORS issues

---

## Mobile Considerations

The layout is inherently mobile-friendly:
- Map fills viewport on all screen sizes
- Floating stepper card uses percentage-based horizontal margins
- Drawer is a standard mobile pattern (swipe up/down) — Vaul handles this natively
- Trip creation form renders as a bottom sheet on mobile

---

## Future Hooks (Not in Scope)

These are noted for future phases but explicitly **not built now**:
- Driver-side UI (accept trips, send location updates, mark stops)
- Trip rating/review after completion
- Business/pet-taxi integration (driver marks completion → auto-updates frontend)
- Push notifications for trip status changes
- Trip history page
- Payment integration in drawer (Phase 7 — placeholder only for now)
- Intermediate stops in trip creation (MVP is pickup → dropoff only)
