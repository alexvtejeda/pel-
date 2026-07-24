# Spec: Transport Marketplace Wiring (Quote Preview · Businesses Picker + Directory · Decline)

**Date:** 2026-07-24
**Status:** Approved — ready for implementation plan
**Repo:** `frontend` (pel-) wires against `api` (pelu-api)
**Contract source of truth:** `api/docs/api/swagger.yaml` (live Scalar UI at `http://localhost:2701/docs`)
**Parent inventory:** [`2026-07-21-frontend-api-wiring-gaps.md`](./2026-07-21-frontend-api-wiring-gaps.md) — Cluster 2 (P2)

## Context

The P2 "Transport gaps" cluster from the parent inventory: three backend endpoints that
`lib/api/transport.ts` never calls. They are the frontend half of the backend pet-taxi
**marketplace** (see `api/CLAUDE.md` → "Pet-Taxi Quotes & Routing"):

| Method | Path | Purpose |
|---|---|---|
| GET | `/transport/businesses` | Distance-ordered list of opted-in pet-taxi businesses (optional per-row quote). |
| POST | `/transport/quote` | Authoritative price/distance/duration for one business + route. |
| PATCH | `/transport/{id}/decline` | The targeted business declines a pending marketplace trip. |

### The key backend insight that shapes this spec

`POST /transport/request` **already accepts an optional `business_id`** (present in the Go
handler — `internal/transport/handler.go` — though the swagger request body only documents
`target_driver_id`). When `business_id` is supplied the handler:
- looks up the business's `user_id` and sets it as `target_driver_id` (so the trip routes to
  that business),
- computes + persists the quote (distance/duration/price/routing flags),
- stamps `business_id` on the trip.

Only trips with a non-NULL `business_id` are **marketplace** trips, and **only those can be
declined** ("Broadcast trips (NULL business_id) cannot be declined — they're cancelled with
the existing /cancel endpoint"). Therefore, to wire quote + businesses + decline *cohesively*,
the request flow must submit `business_id` (not `target_driver_id`). This is the approved
approach ("full marketplace reflow").

### Current state (verified 2026-07-24)

- All three endpoints have **zero** frontend references.
- The request form (`components/transport/transport-creation-form.tsx`) targets a driver via
  the generic **`ProviderPicker`**, which lists `GET /providers?service=taxi`
  (`UnifiedProvider`, keyed on `user_id`) and submits `target_driver_id`.
- `ProviderPicker` is used by **two** surfaces — the `/transporte` flow and the in-chat
  "request transport" flow (`components/chat/chat-message-thread.tsx`), both through
  `TransportCreationForm`. The reflow lands in both.
- The transporter dashboard (`components/dashboard/business/requests-tab.tsx`) has a
  "Rechazar" action that calls `cancelTrip` — the wrong path for a marketplace trip.

## Conventions to follow (from project CLAUDE.md)

- **API client**: new functions return `{ data, error }`, never throw. Use `apiClient()`
  (cookie auth). No tokens.
- **Icons**: Font Awesome, sized with `text-*`. **Radius**: cards `rounded-2xl`,
  buttons/inputs `rounded-xl`. **Toasts**: Sonner.
- **i18n**: Spanish-first; add every string to both `public/locales/es` and `.../en`,
  register in `lib/i18n/index.ts`. Prices are **DOP** (`RD$`).

---

## Piece A — Types & API · `lib/api/transport.ts`

### Backend contracts

**`POST /transport/quote`** — body `{ business_id: string, from: Point, to: Point }` where
`Point = { lat: number, lng: number }`. Returns
`{ business_id, currency, distance_km, duration_minutes, estimated_price, routing_degraded, routing_source }`.
`400` if `business_id` missing, coords outside the DR bounding box, or the business isn't a
configured pet-taxi. `routing_degraded: true` means the price is a Haversine fallback estimate.

**`GET /transport/businesses`** — query params: `lat` + `lng` (**required**, member location,
for distance ordering); `from_lat` + `from_lng` + `to_lat` + `to_lng` (**all four** to include
per-row quotes; omit for "in your area" mode); `cursor`; page size (default 20, max 50). Returns
`{ items: MarketplaceBusiness[], next_cursor: string }`.

**`PATCH /transport/{id}/decline`** — no body. Returns `transport.Trip` (200). `403` if the
caller isn't the targeted business; `400`/`404` otherwise. Only valid for marketplace
(`business_id` non-NULL) trips.

### Additions

- Types:
  - `Point = { lat: number; lng: number }`
  - `MarketplaceQuote = { distance_km: number; duration_minutes: number; estimated_price: number; routing_degraded: boolean }`
  - `MarketplaceBusiness = { business_id: string; name: string; phone: string; cover_photo_url?: string; operating_hours?: string; distance_from_member_km: number; quote?: MarketplaceQuote }`
  - Extend `Trip` with `business_id?: string | null`.
  - Extend `RequestTripPayload` with `business_id?: string` (and stop sending `target_driver_id`
    when `business_id` is present).
- Functions (all `{ data, error }`):
  - `quoteTrip(input: { business_id: string; from: Point; to: Point })` → `POST /api/v1/transport/quote`.
  - `listTransportBusinesses(params: { lat: number; lng: number; from?: Point; to?: Point; cursor?: string })`
    → builds the query string (include the four route params only when both `from` and `to`
    are given) → `GET /api/v1/transport/businesses` → `{ items, next_cursor }`.
  - `declineTrip(id: string)` → `PATCH /api/v1/transport/${id}/decline` → `{ data: Trip, error }`.

---

## Piece B — Request-flow reflow · `TransportCreationForm` + new `TransportBusinessPicker`

The flow reorders to **addresses-first**, because the businesses list and quotes need
coordinates. Applies to **both** consumers (`/transporte` and the chat request flow).

1. Member fills pickup + dropoff + pet, then taps **"Elegir transportista"** (enabled once
   both addresses + pet are filled). On tap, geocode both addresses with the existing
   Nominatim `geocodeAddress` helper. **The geocoded pickup doubles as the member `lat/lng`**
   — no browser geolocation prompt mid-booking.
2. Open the new **`TransportBusinessPicker`** (`components/transport/transport-business-picker.tsx`):
   `listTransportBusinesses({ lat/lng = pickup, from = pickup, to = dropoff })`. Each row shows
   name, `distance_from_member_km`, and a **live quote** — `RD$ estimated_price`, duration; when
   `quote.routing_degraded` is true, label the price "aproximado". "Cargar más" pages via
   `next_cursor`. Empty state when no pet-taxis serve the area.
3. Selecting a business stores its `business_id`; the form shows the chosen business and an
   authoritative re-quote via **`quoteTrip({ business_id, from, to })`** on the submit button
   (`Solicitar · RD$ …`). A degraded re-quote still submits — just labelled approximate.
4. Submit → `requestTrip({ ..., business_id })` (no `target_driver_id`). The backend derives
   the driver, persists the price, and marks the trip declinable.

**Component boundary:** introduce a dedicated `TransportBusinessPicker` rather than mutating
`ProviderPicker`. Switch both transport consumers to it. `ProviderPicker` / `UnifiedProvider` /
the `/aliados` directory are **untouched** (they share types we don't want to disturb). If
`ProviderPicker` ends up with no remaining consumers after the switch, remove it in the same PR.

---

## Piece C — Standalone directory · new `app/transporte/negocios/`

A browsable pet-taxi directory outside of booking.

- `layout.tsx` → `<ProtectedRoute requireRole={['member','rescue_center']}>` (mirror
  `app/transporte/layout.tsx`); `page.tsx` renders the shared header + a responsive grid.
- **Location via browser geolocation**: request `navigator.geolocation.getCurrentPosition` for
  `lat/lng`. **No route params** → "in your area" mode (`quote` omitted), distance-ordered,
  cursor-paginated ("Cargar más").
- **Geolocation denied / unavailable**: show a friendly prompt with a retry button; the page
  has no hard dependency on a location (v1 does **not** offer manual city entry — see open
  questions).
- Each card (`rounded-2xl`): name, phone, `distance_from_member_km`, operating hours,
  cover photo when present. Read-only discovery — booking still goes through the request flow.
- Reachable from the `/transporte` page via a "Ver transportistas" affordance. **No** other
  nav entry.

---

## Piece D — Decline wiring · `components/dashboard/business/requests-tab.tsx`

- In `DetailView`, for a `requested` trip: if it's a **marketplace** trip (`trip.business_id`
  is set), the "Rechazar" button calls **`declineTrip(trip.id)`** instead of `cancelTrip`.
  Broadcast trips (no `business_id`) keep `cancelTrip`.
- `declineTrip` returns the updated `Trip`; feed it to the existing `handleTripUpdated` so the
  card/detail refresh (status → `cancelled`). Show a Sonner toast.
- This depends on the `Trip.business_id` field added in Piece A being present in
  `listTrips('driver')` responses (the backend already selects it).

---

## Cross-cutting

### i18n

Add to both `es` + `en` and register in `lib/i18n/index.ts`:
- `transport` namespace: "Elegir transportista", "Cargar más", "precio estimado",
  "aproximado", distance/duration labels, directory page copy, geolocation prompt/retry copy,
  empty states.
- `business` namespace: decline confirmation/label (reuse `requests.reject` if the copy fits).

### Testing (Vitest + RTL, `renderWithProviders`)

- **API units** (mock `apiClient`): `quoteTrip` (body shape), `listTransportBusinesses`
  (query-string building **with and without** route params), `declineTrip` (path). Each
  asserts `{ data, error }` on success + failure.
- **Components**: `TransportBusinessPicker` renders rows with quote + degraded label +
  "Cargar más" pagination; the reflow submits `business_id` (not `target_driver_id`);
  `requests-tab` routes reject → `declineTrip` for a marketplace trip and → `cancelTrip` for a
  broadcast trip; the directory page handles the geolocation-denied path.

## Out of scope

- The live **in-trip ETA** (backend keeps Haversine + assumed 30 km/h there by design — do not
  route it through the quote chain).
- Business-side pet-taxi pricing setup (`taxi_base_fee` etc.) — already exists in business
  settings; a business must opt in for it to appear in the list.
- Manual city entry as a geolocation fallback (retry-only for v1).
- The P1 Service Providers cluster — separate spec.

## Open questions to resolve during implementation

1. **Broadcast reject**: should a business be able to reject a *broadcast* trip at all, or only
   marketplace ones? If broadcast trips shouldn't be rejectable from the dashboard, hide the
   button for them instead of falling back to `cancelTrip`.
2. **Directory geolocation fallback**: v1 is retry-only; confirm that's acceptable vs. a manual
   location picker.
3. **`ProviderPicker` removal**: confirm no non-transport consumer remains before deleting it.

## Implementation checklist

- [ ] **API** — `Point`/`MarketplaceBusiness`/`MarketplaceQuote` types; `Trip.business_id` +
      `RequestTripPayload.business_id`; `quoteTrip` / `listTransportBusinesses` / `declineTrip`.
- [ ] **Reflow** — addresses-first `TransportCreationForm`; new `TransportBusinessPicker` with
      live quotes + pagination; submit `business_id`; switch both transport consumers.
- [ ] **Directory** — `app/transporte/negocios/{layout,page}.tsx` with geolocation + "in your
      area" mode; "Ver transportistas" link from `/transporte`.
- [ ] **Decline** — reject → `declineTrip` for marketplace trips in `requests-tab.tsx`.
- [ ] i18n strings (es + en) for all of the above.
- [ ] Vitest coverage for the 3 new API functions + the four UI touchpoints.
