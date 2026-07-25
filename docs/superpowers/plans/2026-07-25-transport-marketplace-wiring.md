# Transport Marketplace Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the three unused pet-taxi marketplace endpoints (`POST /transport/quote`, `GET /transport/businesses`, `PATCH /transport/{id}/decline`) into the frontend: a quote-driven business picker in the request flow, a standalone transporter directory, and a marketplace-aware decline action.

**Architecture:** Reflow `TransportCreationForm` to **addresses-first** so the new `TransportBusinessPicker` can list businesses with live route quotes; the form submits `business_id` (backend derives the driver + persists the quote + makes the trip declinable). A standalone `/transporte/negocios` directory browses pet-taxis via browser geolocation ("in your area", no quote). The transporter dashboard's "Rechazar" routes to `declineTrip` for marketplace trips and keeps `cancelTrip` for broadcast trips. All frontend — no API changes (the backend already ships all three endpoints).

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript / Tailwind v4 / react-i18next / Sonner / Vitest + React Testing Library. Package manager: **Bun**. Tests: `npx vitest run <file>` (there is no `test` script).

---

## Repo & Contract

- **Repo:** `frontend` (`~/pelu/frontend`, remote `pel-`). **No `api` changes** — verified all three endpoints already exist (`internal/transport/handler.go`, `router.go`, `marketplace.go`).
- **Contract source of truth:** verified against the live Go handlers on 2026-07-25 (swagger under-documents `business_id` on `/transport/request`).

### Verified backend shapes

**`POST /api/v1/transport/quote`** — body `{ business_id, from: {lat,lng}, to: {lat,lng} }`.
Response `200`:
```json
{ "business_id": "…", "distance_km": 12.4, "duration_minutes": 22, "estimated_price": 450.0,
  "routing_degraded": false, "routing_source": "ors", "currency": "DOP" }
```
`400` when `business_id` missing, coords outside DR bounding box, or the business isn't a configured pet-taxi.

**`GET /api/v1/transport/businesses`** — query: `lat`,`lng` **(required)**; `from_lat`,`from_lng`,`to_lat`,`to_lng` (**all four** → per-row `quote`); `cursor`; `limit` (default 20, max 50).
Response `200`:
```json
{ "items": [ { "business_id":"…","name":"…","phone":"…","cover_photo_url":"…"?,
  "operating_hours":"{\"monday\":{...}}"?, "distance_from_member_km": 3.2,
  "quote": { "distance_km":12.4,"duration_minutes":22,"estimated_price":450.0,"routing_degraded":false }? } ],
  "next_cursor": "…" }
```
`operating_hours` comes back as a **raw JSON string** (`operating_hours::text`), not an object. `quote` is omitted without the four route params.

**`PATCH /api/v1/transport/{id}/decline`** — no body. Returns the updated `Trip` (`status:"cancelled"`). `403` if caller isn't the targeted business; `409` "trip is no longer pending" if status != `requested`; `404`/`400` otherwise. **Only** valid for marketplace trips (non-NULL `business_id`).

**`Trip.business_id`** is `*string` → JSON `business_id,omitempty`, and is selected in `listTrips('driver')` (verified `tripCols` in `repository.go`).

---

## Decisions resolved (spec "Open questions")

1. **Broadcast reject (Q1):** keep the current behavior — a `requested` **broadcast** trip (no `business_id`) still calls `cancelTrip`; a **marketplace** trip (`business_id` set) calls `declineTrip`. No button hiding. (Spec Piece D default.)
2. **Directory geolocation fallback (Q2):** **retry-only** for v1. No manual city entry.
3. **`ProviderPicker` removal (Q3):** after the reflow, `ProviderPicker`'s only two consumers (`transport-creation-form.tsx`, `chat-message-thread.tsx`) stop using it → **delete `components/transport/provider-picker.tsx`** (Task 8). `ProviderCard`, `listProviders`, `UnifiedProvider`, and `/aliados` stay untouched.

## Deviation from spec (chat entry point)

The spec says both consumers pick a transporter "through `TransportCreationForm`". In reality **`chat-message-thread.tsx` renders `ProviderPicker` directly**, then navigates to `/transporte?…&provider_id=<userId>` — a pre-chosen driver (`target_driver_id`) that is **incompatible** with the `business_id` marketplace model. To make the reflow cohesive and let us delete `ProviderPicker`, the chat "Solicitar transporte" item now **navigates straight to `/transporte?pet_id=…&conversation_id=…`** (no `provider_id`, no in-chat picker); the reflowed form does the business selection. The now-dead `provider_id`/`providerId` plumbing (`app/transporte/page.tsx`, `transport-page.tsx`, `transport-creation-form.tsx`) is removed. This is captured in Tasks 4–5.

---

## File Structure

**Create**
- `components/transport/transport-business-picker.tsx` — quote-aware business picker dialog (replaces `ProviderPicker` in the request flow).
- `app/transporte/negocios/layout.tsx` — `ProtectedRoute` wrapper (mirrors `app/transporte/layout.tsx`).
- `app/transporte/negocios/page.tsx` — standalone geolocation directory.
- `components/__tests__/transport/transport-business-picker.test.tsx`
- `components/__tests__/transport/transport-creation-form.test.tsx`
- `components/__tests__/transport/negocios-page.test.tsx`
- `components/__tests__/dashboard/requests-tab-decline.test.tsx`

**Modify**
- `lib/api/transport.ts` — types + `quoteTrip` / `listTransportBusinesses` / `declineTrip`.
- `lib/api/__tests__/transport.test.ts` — units for the three new functions.
- `components/transport/transport-creation-form.tsx` — addresses-first reflow; drop `providerId`.
- `components/transport/transport-page.tsx` — drop `providerId` pass-through.
- `app/transporte/page.tsx` — drop `provider_id` search param.
- `components/chat/chat-message-thread.tsx` — chat item navigates directly; remove in-chat `ProviderPicker`.
- `components/dashboard/business/requests-tab.tsx` — marketplace-aware reject.
- `public/locales/es/transport.json`, `public/locales/en/transport.json` — new keys.
- `public/locales/es/business.json`, `public/locales/en/business.json` — `requests.reject_success`.

**Delete**
- `components/transport/provider-picker.tsx` (Task 8, after consumers switch).

**Not touched (guardrails):** `lib/api/providers.ts`, `components/providers/provider-card.tsx`, `app/(public)/aliados/*`, `lib/i18n/index.ts` (namespaces `transport`/`business` already registered — only keys are added), `lib/i18n/config.ts` (type aliases only, no per-key types), the in-trip ETA / `transport.Tracker`.

---

### Task 0: Branch setup

`main` is **ahead** of the `docs/transport-marketplace-wiring-spec` branch (it has the merged "small wins" work). Branch off **`main`** and bring the spec doc along — do **not** build on the stale spec branch.

- [ ] **Step 1: Create the feature branch off `main` and import the spec doc**

```bash
cd ~/pelu/frontend
git checkout main
git checkout -b feature/transport-marketplace-wiring
git checkout docs/transport-marketplace-wiring-spec -- docs/superpowers/specs/2026-07-24-transport-marketplace-wiring-design.md
git add docs/superpowers/specs/2026-07-24-transport-marketplace-wiring-design.md docs/superpowers/plans/2026-07-25-transport-marketplace-wiring.md
git commit -m "docs: import transport marketplace spec + implementation plan"
```

Expected: new branch `feature/transport-marketplace-wiring`; spec + this plan tracked on it.

---

### Task 1: API types & functions · `lib/api/transport.ts`

**Files:**
- Modify: `lib/api/transport.ts`
- Test: `lib/api/__tests__/transport.test.ts`

- [ ] **Step 1: Add failing unit tests** — append to `lib/api/__tests__/transport.test.ts`. Update the import on line 2 to include the new functions, then add the `describe` blocks.

Change line 2 to:
```ts
import { requestTrip, listTrips, getTrip, cancelTrip, acceptTrip, updateTripStatus, completeStop, quoteTrip, listTransportBusinesses, declineTrip } from '../transport'
```

Append at end of file:
```ts
describe('quoteTrip', () => {
  it('POSTs the quote body and returns data', async () => {
    const quote = { business_id: 'b1', distance_km: 12.4, duration_minutes: 22, estimated_price: 450, routing_degraded: false, routing_source: 'ors', currency: 'DOP' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(quote) } as Response)

    const result = await quoteTrip({ business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 } })
    expect(result).toEqual({ data: quote, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/quote', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 } }),
    }))
  })

  it('returns error on API failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'business does not offer pet taxi service' }) } as Response)
    const result = await quoteTrip({ business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 } })
    expect(result).toEqual({ data: null, error: 'business does not offer pet taxi service' })
  })
})

describe('listTransportBusinesses', () => {
  it('sends only lat/lng when no route params ("in your area" mode)', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], next_cursor: '' }) } as Response)
    await listTransportBusinesses({ lat: 18.5, lng: -69.9 })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/businesses?lat=18.5&lng=-69.9')
  })

  it('includes all four route params + cursor when from/to given', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], next_cursor: '' }) } as Response)
    await listTransportBusinesses({
      lat: 18.5, lng: -69.9,
      from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.4, lng: -69.8 }, cursor: 'c1',
    })
    const url = mockApiClient.mock.calls[0][0] as string
    expect(url).toContain('lat=18.5')
    expect(url).toContain('from_lat=18.5')
    expect(url).toContain('from_lng=-69.9')
    expect(url).toContain('to_lat=18.4')
    expect(url).toContain('to_lng=-69.8')
    expect(url).toContain('cursor=c1')
  })

  it('returns the {items,next_cursor} payload', async () => {
    const payload = { items: [{ business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2 }], next_cursor: 'n1' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(payload) } as Response)
    const result = await listTransportBusinesses({ lat: 18.5, lng: -69.9 })
    expect(result).toEqual({ data: payload, error: null })
  })
})

describe('declineTrip', () => {
  it('PATCHes the decline path and returns the cancelled trip', async () => {
    const declined = { ...mockTrip, status: 'cancelled', business_id: 'b1' }
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve(declined) } as Response)
    const result = await declineTrip('t1')
    expect(result).toEqual({ data: declined, error: null })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/transport/t1/decline', { method: 'PATCH' })
  })

  it('returns error on failure', async () => {
    mockApiClient.mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'only the targeted business may decline this trip' }) } as Response)
    const result = await declineTrip('t1')
    expect(result).toEqual({ data: null, error: 'only the targeted business may decline this trip' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/api/__tests__/transport.test.ts`
Expected: FAIL — `quoteTrip`/`listTransportBusinesses`/`declineTrip` are not exported.

- [ ] **Step 3: Add the types** — in `lib/api/transport.ts`, insert after the `DriverLocation` interface (after line 38):

```ts
export interface Point {
  lat: number
  lng: number
}

export interface MarketplaceQuote {
  distance_km: number
  duration_minutes: number
  estimated_price: number
  routing_degraded: boolean
}

export interface TripQuote {
  business_id: string
  distance_km: number
  duration_minutes: number
  estimated_price: number
  routing_degraded: boolean
  routing_source: string
  currency: string
}

export interface MarketplaceBusiness {
  business_id: string
  name: string
  phone: string
  cover_photo_url?: string
  operating_hours?: string
  distance_from_member_km: number
  quote?: MarketplaceQuote
}
```

- [ ] **Step 4: Extend `Trip` and `RequestTripPayload`** — add `business_id` to both.

In `interface Trip` (after `target_driver_id?: string | null` on line 24) add:
```ts
  business_id?: string | null
```

In `interface RequestTripPayload` (after `target_driver_id?: string` on line 43) add:
```ts
  business_id?: string
```

- [ ] **Step 5: Add the three functions** — append at the end of `lib/api/transport.ts`:

```ts
// --- Marketplace (quote / businesses / decline) ---

export async function quoteTrip(input: { business_id: string; from: Point; to: Point }): Promise<{ data: TripQuote | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/transport/quote', { method: 'POST', body: JSON.stringify(input) })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al calcular la cotización' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function listTransportBusinesses(params: {
  lat: number
  lng: number
  from?: Point
  to?: Point
  cursor?: string
}): Promise<{ data: { items: MarketplaceBusiness[]; next_cursor: string } | null; error: string | null }> {
  try {
    const q = new URLSearchParams()
    q.set('lat', String(params.lat))
    q.set('lng', String(params.lng))
    if (params.from && params.to) {
      q.set('from_lat', String(params.from.lat))
      q.set('from_lng', String(params.from.lng))
      q.set('to_lat', String(params.to.lat))
      q.set('to_lng', String(params.to.lng))
    }
    if (params.cursor) q.set('cursor', params.cursor)
    const res = await apiClient(`/api/v1/transport/businesses?${q.toString()}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar transportistas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function declineTrip(id: string): Promise<{ data: Trip | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/transport/${id}/decline`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al rechazar viaje' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

> Note: `URLSearchParams` orders keys by insertion, so the no-route call serializes to exactly `?lat=…&lng=…` (matches the Step 1 assertion). `-69.9` needs no encoding.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run lib/api/__tests__/transport.test.ts`
Expected: PASS (all `quoteTrip` / `listTransportBusinesses` / `declineTrip` cases green).

- [ ] **Step 7: Commit**

```bash
git add lib/api/transport.ts lib/api/__tests__/transport.test.ts
git commit -m "feat(transport): add quoteTrip, listTransportBusinesses, declineTrip API"
```

---

### Task 2: i18n strings (es + en)

**Files:**
- Modify: `public/locales/es/transport.json`, `public/locales/en/transport.json`
- Modify: `public/locales/es/business.json`, `public/locales/en/business.json`

No test. Namespaces already registered in `lib/i18n/index.ts` — **only add keys**.

- [ ] **Step 1: `public/locales/es/transport.json`** — add three keys to the existing `form` object, and two new top-level objects `marketplace` and `directory`.

Add inside `"form": { … }`:
```json
    "choose_transporter": "Elegir transportista",
    "change_transporter": "Cambiar transportista",
    "request_with_price": "Solicitar · RD$ {{price}}",
    "quoting": "Calculando precio..."
```
Add as new top-level keys:
```json
  "marketplace": {
    "picker_title": "Elegir transportista",
    "empty": "No hay transportistas en tu zona por ahora",
    "load_more": "Cargar más",
    "distance_km": "{{km}} km",
    "duration_min": "~{{min}} min",
    "price": "RD$ {{price}}",
    "approx": "aproximado"
  },
  "directory": {
    "title": "Transportistas",
    "subtitle": "Pet-taxis cerca de ti",
    "view_link": "Ver transportistas",
    "geo_prompt": "Activa tu ubicación para ver transportistas cercanos",
    "geo_retry": "Reintentar",
    "empty": "No hay transportistas en tu zona por ahora",
    "load_more": "Cargar más"
  }
```

- [ ] **Step 2: `public/locales/en/transport.json`** — mirror it.

Add inside `"form": { … }`:
```json
    "choose_transporter": "Choose transporter",
    "change_transporter": "Change transporter",
    "request_with_price": "Request · RD$ {{price}}",
    "quoting": "Calculating price..."
```
Add as new top-level keys:
```json
  "marketplace": {
    "picker_title": "Choose transporter",
    "empty": "No transporters in your area yet",
    "load_more": "Load more",
    "distance_km": "{{km}} km",
    "duration_min": "~{{min}} min",
    "price": "RD$ {{price}}",
    "approx": "approx."
  },
  "directory": {
    "title": "Transporters",
    "subtitle": "Pet-taxis near you",
    "view_link": "View transporters",
    "geo_prompt": "Enable your location to see nearby transporters",
    "geo_retry": "Retry",
    "empty": "No transporters in your area yet",
    "load_more": "Load more"
  }
```

- [ ] **Step 3: `business.json` (es + en)** — add `reject_success` inside the existing `requests` object.

`public/locales/es/business.json` → `"requests": { … }`:
```json
    "reject_success": "Solicitud rechazada"
```
`public/locales/en/business.json` → `"requests": { … }`:
```json
    "reject_success": "Request declined"
```

- [ ] **Step 4: Verify all four files are valid JSON**

Run: `node -e "['es','en'].forEach(l=>['transport','business'].forEach(n=>{JSON.parse(require('fs').readFileSync('public/locales/'+l+'/'+n+'.json'));console.log(l,n,'ok')}))"`
Expected: `es transport ok` … `en business ok` (no parse errors).

- [ ] **Step 5: Commit**

```bash
git add public/locales/es/transport.json public/locales/en/transport.json public/locales/es/business.json public/locales/en/business.json
git commit -m "i18n(transport): marketplace picker, directory, decline strings"
```

---

### Task 3: `TransportBusinessPicker` component

**Files:**
- Create: `components/transport/transport-business-picker.tsx`
- Test: `components/__tests__/transport/transport-business-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportBusinessPicker } from '@/components/transport/transport-business-picker'

vi.mock('@/lib/api/transport', () => ({
  listTransportBusinesses: vi.fn(),
}))
import { listTransportBusinesses } from '@/lib/api/transport'
const mockList = vi.mocked(listTransportBusinesses)

const from = { lat: 18.5, lng: -69.9 }
const to = { lat: 18.4, lng: -69.8 }

beforeEach(() => vi.clearAllMocks())

describe('TransportBusinessPicker', () => {
  it('renders rows with quote, degraded label, and paginates via next_cursor', async () => {
    mockList
      .mockResolvedValueOnce({ data: { items: [
        { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2,
          quote: { distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: true } },
      ], next_cursor: 'c2' }, error: null })
      .mockResolvedValueOnce({ data: { items: [
        { business_id: 'b2', name: 'FastPaws', phone: '829', distance_from_member_km: 5.1,
          quote: { distance_km: 14, duration_minutes: 26, estimated_price: 500, routing_degraded: false } },
      ], next_cursor: '' }, error: null })

    const onSelect = vi.fn()
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={onSelect}
        lat={from.lat} lng={from.lng} from={from} to={to} />
    )

    expect(await screen.findByText('PetGo')).toBeInTheDocument()
    expect(screen.getByText('RD$ 450')).toBeInTheDocument()
    expect(screen.getByText('(aproximado)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cargar más'))
    expect(await screen.findByText('FastPaws')).toBeInTheDocument()
    expect(screen.getByText('PetGo')).toBeInTheDocument() // appended, not replaced

    fireEvent.click(screen.getByText('PetGo'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'b1' }))
  })

  it('shows the empty state when no businesses serve the area', async () => {
    mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to} />
    )
    expect(await screen.findByText('No hay transportistas en tu zona por ahora')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/transport-business-picker.test.tsx`
Expected: FAIL — module `transport-business-picker` not found.

- [ ] **Step 3: Create `components/transport/transport-business-picker.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faLocationDot } from '@fortawesome/free-solid-svg-icons'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listTransportBusinesses, MarketplaceBusiness, Point } from '@/lib/api/transport'

interface TransportBusinessPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (business: MarketplaceBusiness) => void
  lat: number
  lng: number
  from: Point
  to: Point
}

export function TransportBusinessPicker({ open, onOpenChange, onSelect, lat, lng, from, to }: TransportBusinessPickerProps) {
  const { t } = useTranslation('transport')
  const [items, setItems] = useState<MarketplaceBusiness[]>([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextCursor?: string) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listTransportBusinesses({ lat, lng, from, to, cursor: nextCursor })
    setLoading(false)
    if (err || !data) { setError(err || 'Error'); return }
    setItems(prev => (nextCursor ? [...prev, ...data.items] : data.items))
    setCursor(data.next_cursor)
  }, [lat, lng, from, to])

  useEffect(() => {
    if (!open) return
    setItems([])
    setCursor('')
    load()
  }, [open, load])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('marketplace.picker_title')}</DialogTitle>
        </DialogHeader>

        {loading && items.length === 0 && (
          <div className="flex justify-center py-12">
            <FontAwesomeIcon icon={faSpinner} className="text-2xl text-muted-foreground animate-spin" />
          </div>
        )}
        {error && <p className="text-destructive text-sm py-8 text-center">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">{t('marketplace.empty')}</p>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {items.map(b => (
              <button
                key={b.business_id}
                type="button"
                onClick={() => onSelect(b)}
                className="w-full text-left rounded-2xl border bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm truncate">{b.name}</span>
                  {b.quote && (
                    <span className="text-sm font-semibold shrink-0">
                      {t('marketplace.price', { price: Math.round(b.quote.estimated_price) })}
                      {b.quote.routing_degraded && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">({t('marketplace.approx')})</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    <FontAwesomeIcon icon={faLocationDot} className="text-xs mr-1" />
                    {t('marketplace.distance_km', { km: b.distance_from_member_km.toFixed(1) })}
                  </span>
                  {b.quote && <span>{t('marketplace.duration_min', { min: b.quote.duration_minutes })}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {cursor && (
          <button
            type="button"
            onClick={() => load(cursor)}
            disabled={loading}
            className="w-full mt-2 py-2 rounded-xl border border-input text-sm font-medium hover:bg-accent/50 disabled:opacity-50"
          >
            {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : t('marketplace.load_more')}
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/__tests__/transport/transport-business-picker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/transport/transport-business-picker.tsx components/__tests__/transport/transport-business-picker.test.tsx
git commit -m "feat(transport): TransportBusinessPicker with live quotes + pagination"
```

---

### Task 4: Reflow `TransportCreationForm` + drop `providerId` plumbing

**Files:**
- Modify: `components/transport/transport-creation-form.tsx` (full rewrite)
- Modify: `components/transport/transport-page.tsx` (drop `providerId`)
- Modify: `app/transporte/page.tsx` (drop `provider_id`)
- Test: `components/__tests__/transport/transport-creation-form.test.tsx`

- [ ] **Step 1: Write the failing test** — drives addresses → choose → pick business → submit, asserting `business_id` (and NOT `target_driver_id`).

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportCreationForm } from '@/components/transport/transport-creation-form'

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'member' } }),
}))

vi.mock('@/lib/api/user-pets', () => ({
  listUserPets: vi.fn().mockResolvedValue({ data: [{ id: 'p1', name: 'Firulais' }], error: null }),
}))
vi.mock('@/lib/api/pets', () => ({ listPets: vi.fn() }))
vi.mock('@/lib/api/rescue-centers', () => ({ getMyRescueCenter: vi.fn() }))

vi.mock('@/lib/api/transport', () => ({
  requestTrip: vi.fn(),
  quoteTrip: vi.fn(),
  listTransportBusinesses: vi.fn(),
}))
import { requestTrip, quoteTrip, listTransportBusinesses } from '@/lib/api/transport'
const mockRequest = vi.mocked(requestTrip)
const mockQuote = vi.mocked(quoteTrip)
const mockList = vi.mocked(listTransportBusinesses)

beforeEach(() => {
  vi.clearAllMocks()
  // Nominatim geocode — both pickup and dropoff resolve to a DR point.
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve([{ lat: '18.5', lon: '-69.9' }]),
  }) as unknown as typeof fetch
  mockList.mockResolvedValue({ data: { items: [
    { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2,
      quote: { distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false } },
  ], next_cursor: '' }, error: null })
  mockQuote.mockResolvedValue({ data: { business_id: 'b1', distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false, routing_source: 'ors', currency: 'DOP' }, error: null })
  mockRequest.mockResolvedValue({ data: { id: 't1', status: 'requested' } as never, error: null })
})

describe('TransportCreationForm reflow', () => {
  it('submits business_id (not target_driver_id)', async () => {
    const onTripCreated = vi.fn()
    renderWithProviders(<TransportCreationForm onTripCreated={onTripCreated} />)

    await screen.findByRole('option', { name: 'Firulais' })
    fireEvent.change(screen.getByPlaceholderText('Dirección de recogida'), { target: { value: 'Calle A' } })
    fireEvent.change(screen.getByPlaceholderText('Dirección de entrega'), { target: { value: 'Calle B' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } })

    fireEvent.click(screen.getByText('Elegir transportista'))
    // Picker opens with the geocoded coords and lists PetGo
    fireEvent.click(await screen.findByText('PetGo'))

    // Authoritative re-quote fires; submit becomes enabled with the price
    await waitFor(() => expect(mockQuote).toHaveBeenCalledWith({
      business_id: 'b1', from: { lat: 18.5, lng: -69.9 }, to: { lat: 18.5, lng: -69.9 },
    }))
    fireEvent.click(await screen.findByText('Solicitar · RD$ 450'))

    await waitFor(() => expect(mockRequest).toHaveBeenCalled())
    const payload = mockRequest.mock.calls[0][0]
    expect(payload.business_id).toBe('b1')
    expect(payload).not.toHaveProperty('target_driver_id')
    expect(payload.stops).toHaveLength(2)
    expect(onTripCreated).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/transport-creation-form.test.tsx`
Expected: FAIL — form still renders `ProviderPicker` on mount / no "Elegir transportista".

- [ ] **Step 3: Rewrite `components/transport/transport-creation-form.tsx`** with the full contents:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faTruckFast, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/lib/contexts/auth-context'
import { requestTrip, quoteTrip, Trip, Point, TripQuote, MarketplaceBusiness } from '@/lib/api/transport'
import { listUserPets } from '@/lib/api/user-pets'
import { listPets } from '@/lib/api/pets'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import { TransportBusinessPicker } from '@/components/transport/transport-business-picker'

interface PetOption {
  id: string
  name: string
}

interface TransportCreationFormProps {
  initialPetId?: string
  conversationId?: string
  onTripCreated: (trip: Trip) => void
}

async function geocodeAddress(address: string): Promise<Point | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Pelu-App/1.0' } }
    )
    const data = await res.json()
    if (data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function TransportCreationForm({ initialPetId, conversationId, onTripCreated }: TransportCreationFormProps) {
  const { t } = useTranslation('transport')
  const { user } = useAuth()
  const [pets, setPets] = useState<PetOption[]>([])
  const [selectedPetId, setSelectedPetId] = useState(initialPetId ?? '')
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropoffAddress, setDropoffAddress] = useState('')
  const [pickupCoords, setPickupCoords] = useState<Point | null>(null)
  const [dropoffCoords, setDropoffCoords] = useState<Point | null>(null)
  const [pickupError, setPickupError] = useState('')
  const [dropoffError, setDropoffError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [business, setBusiness] = useState<MarketplaceBusiness | null>(null)
  const [finalQuote, setFinalQuote] = useState<TripQuote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load pets based on role
  useEffect(() => {
    async function loadPets() {
      if (user?.role === 'member') {
        const { data } = await listUserPets()
        if (data) setPets(data.map(p => ({ id: p.id, name: p.name })))
      } else if (user?.role === 'rescue_center') {
        const { data: rc } = await getMyRescueCenter()
        if (rc) {
          try {
            const rcPets = await listPets(rc.id)
            setPets(rcPets.map(p => ({ id: p.id, name: p.name })))
          } catch {
            // listPets throws on failure (known exception to {data, error} pattern)
          }
        }
      }
    }
    loadPets()
  }, [user?.role])

  // Pre-select pet if initialPetId matches
  useEffect(() => {
    if (initialPetId && pets.length > 0) {
      const match = pets.find(p => p.id === initialPetId)
      if (match) setSelectedPetId(match.id)
    }
  }, [initialPetId, pets])

  const clearSelection = () => {
    setBusiness(null)
    setFinalQuote(null)
  }

  const addressesReady = !!pickupAddress && !!dropoffAddress && !!selectedPetId

  // Step 1: geocode both addresses, then open the businesses picker.
  const handleChooseTransporter = async () => {
    setPickupError('')
    setDropoffError('')
    setSubmitError('')
    setGeocoding(true)
    const [pickup, dropoff] = await Promise.all([geocodeAddress(pickupAddress), geocodeAddress(dropoffAddress)])
    setGeocoding(false)
    if (!pickup) { setPickupError(t('form.address_not_found')); return }
    if (!dropoff) { setDropoffError(t('form.address_not_found')); return }
    setPickupCoords(pickup)
    setDropoffCoords(dropoff)
    setPickerOpen(true)
  }

  // Step 2: business chosen — fetch an authoritative quote for the submit button.
  const handleBusinessSelected = async (b: MarketplaceBusiness) => {
    setBusiness(b)
    setPickerOpen(false)
    setFinalQuote(null)
    if (!pickupCoords || !dropoffCoords) return
    setQuoting(true)
    const { data } = await quoteTrip({ business_id: b.business_id, from: pickupCoords, to: dropoffCoords })
    setQuoting(false)
    if (data) setFinalQuote(data)
  }

  // Step 3: submit with business_id (backend derives the driver + persists the quote).
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business || !pickupCoords || !dropoffCoords) return
    setSubmitError('')
    setSubmitting(true)
    const selectedPet = pets.find(p => p.id === selectedPetId)
    const { data, error } = await requestTrip({
      pet_id: selectedPetId,
      pet_description: selectedPet?.name ?? '',
      business_id: business.business_id,
      pickup_address: pickupAddress,
      pickup_lat: pickupCoords.lat,
      pickup_lng: pickupCoords.lng,
      stops: [
        { address: pickupAddress, lat: pickupCoords.lat, lng: pickupCoords.lng },
        { address: dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      ],
      ...(conversationId ? { conversation_id: conversationId } : {}),
    })
    if (error || !data) {
      setSubmitError(error || t('form.error_creating'))
      setSubmitting(false)
      return
    }
    onTripCreated(data)
  }

  const submitLabel = quoting
    ? t('form.quoting')
    : finalQuote
      ? t('form.request_with_price', { price: Math.round(finalQuote.estimated_price) }) +
        (finalQuote.routing_degraded ? ` (${t('marketplace.approx')})` : '')
      : t('form.request_transport')

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 mx-auto max-w-lg sm:max-w-xl md:max-w-2xl">
      {pickupCoords && dropoffCoords && (
        <TransportBusinessPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          lat={pickupCoords.lat}
          lng={pickupCoords.lng}
          from={pickupCoords}
          to={dropoffCoords}
          onSelect={handleBusinessSelected}
        />
      )}
      <form onSubmit={handleSubmit} className="bg-primary/95 backdrop-blur-xl rounded-2xl border border-pop-750 p-4 space-y-3">
        {/* Pickup */}
        <div>
          <input
            type="text"
            placeholder={t('form.pickup_address')}
            value={pickupAddress}
            onChange={e => { setPickupAddress(e.target.value); clearSelection() }}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pop-500"
            required
          />
          {pickupError && <p className="text-red-500 text-xs mt-1">{pickupError}</p>}
        </div>

        {/* Dropoff */}
        <div>
          <input
            type="text"
            placeholder={t('form.dropoff_address')}
            value={dropoffAddress}
            onChange={e => { setDropoffAddress(e.target.value); clearSelection() }}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pop-500"
            required
          />
          {dropoffError && <p className="text-red-500 text-xs mt-1">{dropoffError}</p>}
        </div>

        {/* Pet selector */}
        <select
          value={selectedPetId}
          onChange={e => setSelectedPetId(e.target.value)}
          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-pop-500"
          required
        >
          <option value="">{t('form.select_pet')}</option>
          {pets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Choose transporter / chosen business */}
        {business ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-between bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground"
          >
            <span className="truncate">{business.name}</span>
            <span className="text-muted-foreground shrink-0 ml-2">{t('form.change_transporter')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleChooseTransporter}
            disabled={!addressesReady || geocoding}
            className="w-full bg-background border border-border text-foreground py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={geocoding ? faSpinner : faTruckFast} className={`text-sm ${geocoding ? 'animate-spin' : ''}`} />
            {t('form.choose_transporter')}
          </button>
        )}

        {/* Submit error */}
        {submitError && <p className="text-red-500 text-xs">{submitError}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={!business || submitting || quoting}
          className="w-full bg-pop-500 text-background py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={submitting || quoting ? faSpinner : faPaperPlane} className={`text-sm ${submitting || quoting ? 'animate-spin' : ''}`} />
          {submitLabel}
        </button>

        {/* Directory link */}
        <Link href="/transporte/negocios" className="block text-center text-xs text-background/70 hover:text-background">
          {t('directory.view_link')}
        </Link>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Drop `providerId` from `components/transport/transport-page.tsx`**

Remove `providerId` from the props interface (line 21) and the destructure (line 24), and remove the `providerId={providerId}` line (line 149) from the `<TransportCreationForm>` call. Result — the interface becomes:
```tsx
interface TransportPageProps {
  initialPetId?: string
  conversationId?: string
  tripId?: string
}

export function TransportPage({ initialPetId, conversationId, tripId }: TransportPageProps) {
```
and the render becomes:
```tsx
      {pageState === 'none' && (
        <TransportCreationForm
          initialPetId={initialPetId}
          conversationId={conversationId}
          onTripCreated={(newTrip) => {
            setTrip(newTrip)
            setPageState('requested')
          }}
        />
      )}
```

- [ ] **Step 5: Drop `provider_id` from `app/transporte/page.tsx`**

Remove the `providerId` line and the prop. `TransportContent` becomes:
```tsx
function TransportContent() {
  const searchParams = useSearchParams()
  const petId = searchParams?.get('pet_id') ?? undefined
  const conversationId = searchParams?.get('conversation_id') ?? undefined
  const tripId = searchParams?.get('trip_id') ?? undefined
  return <TransportPage initialPetId={petId} conversationId={conversationId} tripId={tripId} />
}
```

- [ ] **Step 6: Run the reflow test + typecheck**

Run: `npx vitest run components/__tests__/transport/transport-creation-form.test.tsx`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors (confirms `providerId` is gone from all three files; `chat-message-thread.tsx` still compiles — it stops importing `ProviderPicker` in Task 5).

> If `tsc` flags `chat-message-thread.tsx` because it still passes props to `ProviderPicker`, that's expected and fixed in Task 5 — proceed.

- [ ] **Step 7: Commit**

```bash
git add components/transport/transport-creation-form.tsx components/transport/transport-page.tsx app/transporte/page.tsx components/__tests__/transport/transport-creation-form.test.tsx
git commit -m "feat(transport): addresses-first reflow submitting business_id"
```

---

### Task 5: Chat entry point — navigate directly, remove in-chat `ProviderPicker`

**Files:**
- Modify: `components/chat/chat-message-thread.tsx`

- [ ] **Step 1: Remove the `ProviderPicker` import** — delete line 18:
```tsx
import { ProviderPicker } from '@/components/transport/provider-picker'
```

- [ ] **Step 2: Remove the picker state** — delete the `pickerOpen` state (line 59):
```tsx
  const [pickerOpen, setPickerOpen] = useState(false)
```

- [ ] **Step 3: Rewrite the dropdown item + remove the picker block** — replace the current dropdown item and the `<ProviderPicker>` element (lines 329–341) with a single item that navigates straight to `/transporte`:

```tsx
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/transporte?pet_id=${conversation.pet_id}&conversation_id=${conversation.id}`)
                  }
                >
                  <FontAwesomeIcon icon={faTruckFast} className="text-base" />
                  {t('chat.request_transport', { ns: 'transport' })}
                </DropdownMenuItem>
```
and delete the whole `<ProviderPicker open={pickerOpen} … />` block that followed `</DropdownMenu>`.

- [ ] **Step 4: Verify chat compiles and no `ProviderPicker` reference remains here**

Run: `grep -n "ProviderPicker\|pickerOpen" components/chat/chat-message-thread.tsx`
Expected: no output.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-message-thread.tsx
git commit -m "refactor(chat): request-transport navigates to the marketplace flow"
```

---

### Task 6: Standalone directory · `app/transporte/negocios/`

**Files:**
- Create: `app/transporte/negocios/layout.tsx`
- Create: `app/transporte/negocios/page.tsx`
- Test: `components/__tests__/transport/negocios-page.test.tsx`

- [ ] **Step 1: Write the failing test** (geolocation-denied path — the spec's required directory test)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import NegociosPage from '@/app/transporte/negocios/page'

vi.mock('@/lib/api/transport', () => ({ listTransportBusinesses: vi.fn() }))
import { listTransportBusinesses } from '@/lib/api/transport'
const mockList = vi.mocked(listTransportBusinesses)

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
})

describe('NegociosPage geolocation', () => {
  it('shows the retry prompt when geolocation is denied', async () => {
    // getCurrentPosition invokes the error callback
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) => err({} as GeolocationPositionError) },
    })

    renderWithProviders(<NegociosPage />)

    expect(await screen.findByText('Reintentar')).toBeInTheDocument()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('lists businesses in "your area" mode when geolocation is granted', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 18.5, longitude: -69.9 } } as GeolocationPosition) },
    })
    mockList.mockResolvedValue({ data: { items: [
      { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2 },
    ], next_cursor: '' }, error: null })

    renderWithProviders(<NegociosPage />)

    expect(await screen.findByText('PetGo')).toBeInTheDocument()
    // "in your area" mode → no route params
    expect(mockList).toHaveBeenCalledWith({ lat: 18.5, lng: -69.9, cursor: undefined })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/negocios-page.test.tsx`
Expected: FAIL — `@/app/transporte/negocios/page` not found.

- [ ] **Step 3: Create `app/transporte/negocios/layout.tsx`**

```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function NegociosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['member', 'rescue_center']}>
      {children}
    </ProtectedRoute>
  )
}
```

- [ ] **Step 4: Create `app/transporte/negocios/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faLocationDot, faLocationCrosshairs, faPhone, faClock } from '@fortawesome/free-solid-svg-icons'
import { listTransportBusinesses, MarketplaceBusiness } from '@/lib/api/transport'

type GeoState = 'prompting' | 'granted' | 'denied'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// operating_hours arrives as a raw JSON string (backend `operating_hours::text`).
// Show today's window when the business is open; otherwise omit.
function todayHours(json?: string): string | null {
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    const day = parsed?.[DAY_KEYS[new Date().getDay()]]
    if (day?.open && day.from && day.to) return `${day.from} – ${day.to}`
    return null
  } catch {
    return null
  }
}

export default function NegociosPage() {
  const { t } = useTranslation('transport')
  const [geo, setGeo] = useState<GeoState>('prompting')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [items, setItems] = useState<MarketplaceBusiness[]>([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)

  const requestLocation = useCallback(() => {
    setGeo('prompting')
    if (!('geolocation' in navigator)) { setGeo('denied'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeo('granted') },
      () => setGeo('denied'),
    )
  }, [])

  useEffect(() => { requestLocation() }, [requestLocation])

  const load = useCallback(async (nextCursor?: string) => {
    if (!coords) return
    setLoading(true)
    const { data } = await listTransportBusinesses({ lat: coords.lat, lng: coords.lng, cursor: nextCursor })
    setLoading(false)
    if (!data) return
    setItems(prev => (nextCursor ? [...prev, ...data.items] : data.items))
    setCursor(data.next_cursor)
  }, [coords])

  useEffect(() => { if (coords) load() }, [coords, load])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">{t('directory.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('directory.subtitle')}</p>
      </header>

      {geo === 'prompting' && (
        <div className="flex justify-center py-16">
          <FontAwesomeIcon icon={faSpinner} className="text-2xl text-muted-foreground animate-spin" />
        </div>
      )}

      {geo === 'denied' && (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm text-muted-foreground">{t('directory.geo_prompt')}</p>
          <button
            onClick={requestLocation}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pop-500 text-background text-sm font-semibold"
          >
            <FontAwesomeIcon icon={faLocationCrosshairs} className="text-sm" />
            {t('directory.geo_retry')}
          </button>
        </div>
      )}

      {geo === 'granted' && (
        <>
          {!loading && items.length === 0 && (
            <p className="text-center py-16 text-sm text-muted-foreground">{t('directory.empty')}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(b => {
              const hours = todayHours(b.operating_hours)
              return (
                <div key={b.business_id} className="rounded-2xl border bg-card overflow-hidden">
                  {b.cover_photo_url && (
                    <img src={b.cover_photo_url} alt={b.name} className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4 space-y-2">
                    <h2 className="font-semibold text-sm">{b.name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faLocationDot} className="text-xs" />
                      {t('marketplace.distance_km', { km: b.distance_from_member_km.toFixed(1) })}
                    </p>
                    {b.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FontAwesomeIcon icon={faPhone} className="text-xs" />
                        {b.phone}
                      </p>
                    )}
                    {hours && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <FontAwesomeIcon icon={faClock} className="text-xs" />
                        {hours}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {cursor && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => load(cursor)}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-input text-sm font-medium hover:bg-accent/50 disabled:opacity-50"
              >
                {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : t('directory.load_more')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/__tests__/transport/negocios-page.test.tsx`
Expected: PASS (both the denied path and the "your area" listing).

- [ ] **Step 6: Commit**

```bash
git add app/transporte/negocios/layout.tsx app/transporte/negocios/page.tsx components/__tests__/transport/negocios-page.test.tsx
git commit -m "feat(transport): standalone /transporte/negocios directory"
```

---

### Task 7: Decline wiring · `components/dashboard/business/requests-tab.tsx`

**Files:**
- Modify: `components/dashboard/business/requests-tab.tsx`
- Test: `components/__tests__/dashboard/requests-tab-decline.test.tsx`

- [ ] **Step 1: Write the failing test** — marketplace trip → `declineTrip`; broadcast trip → `cancelTrip`.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { RequestsTab } from '@/components/dashboard/business/requests-tab'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/transport', () => ({
  listTrips: vi.fn(),
  acceptTrip: vi.fn(),
  cancelTrip: vi.fn(),
  declineTrip: vi.fn(),
  updateTripStatus: vi.fn(),
}))
import { listTrips, cancelTrip, declineTrip } from '@/lib/api/transport'
const mockList = vi.mocked(listTrips)
const mockCancel = vi.mocked(cancelTrip)
const mockDecline = vi.mocked(declineTrip)

function tripFixture(overrides: Record<string, unknown>) {
  return {
    id: 't1', requester_id: 'u1', driver_id: null, pet_id: 'p1', status: 'requested',
    stops: [{ id: 's1', address: 'Calle A', lat: 18.5, lng: -69.9, position: 0, completed_at: null }],
    created_at: '2026-07-25T00:00:00Z', updated_at: '2026-07-25T00:00:00Z', ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('RequestsTab reject routing', () => {
  it('marketplace trip → declineTrip', async () => {
    mockList.mockResolvedValue({ data: [tripFixture({ business_id: 'b1' })] as never, error: null })
    mockDecline.mockResolvedValue({ data: tripFixture({ business_id: 'b1', status: 'cancelled' }) as never, error: null })

    renderWithProviders(<RequestsTab />)
    fireEvent.click(await screen.findByText('Calle A'))
    fireEvent.click(await screen.findByText('Rechazar'))

    await waitFor(() => expect(mockDecline).toHaveBeenCalledWith('t1'))
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('broadcast trip (no business_id) → cancelTrip', async () => {
    mockList.mockResolvedValue({ data: [tripFixture({})] as never, error: null })
    mockCancel.mockResolvedValue({ data: tripFixture({ status: 'cancelled' }) as never, error: null })

    renderWithProviders(<RequestsTab />)
    fireEvent.click(await screen.findByText('Calle A'))
    fireEvent.click(await screen.findByText('Rechazar'))

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('t1'))
    expect(mockDecline).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/dashboard/requests-tab-decline.test.tsx`
Expected: FAIL — `declineTrip` not imported / reject always calls `cancelTrip`.

- [ ] **Step 3: Update imports in `requests-tab.tsx`** — add `declineTrip` and `toast`.

Change line 14 to:
```tsx
import { Trip, listTrips, acceptTrip, cancelTrip, declineTrip, updateTripStatus } from '@/lib/api/transport'
```
Add after it:
```tsx
import { toast } from 'sonner'
```

- [ ] **Step 4: Route the reject by trip type** — replace `handleReject` (lines 166–171) with:

```tsx
  const handleReject = async () => {
    setActing(true)
    const { data } = trip.business_id ? await declineTrip(trip.id) : await cancelTrip(trip.id)
    if (data) {
      onTripUpdated(data)
      toast.success(t('requests.reject_success'))
    }
    setActing(false)
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/__tests__/dashboard/requests-tab-decline.test.tsx`
Expected: PASS (both routing cases).

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/business/requests-tab.tsx components/__tests__/dashboard/requests-tab-decline.test.tsx
git commit -m "feat(transport): decline marketplace trips from the dashboard"
```

---

### Task 8: Remove the now-unused `ProviderPicker`

**Files:**
- Delete: `components/transport/provider-picker.tsx`

- [ ] **Step 1: Confirm there are no remaining importers**

Run: `grep -rn "provider-picker\|ProviderPicker" --include="*.ts" --include="*.tsx" .`
Expected: no output (both consumers switched in Tasks 4 & 5).

> If anything prints, do NOT delete — fix that consumer first.

- [ ] **Step 2: Delete the file**

```bash
git rm components/transport/provider-picker.tsx
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(transport): remove unused ProviderPicker"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npx vitest run`
Expected: PASS. (Note: `components/__tests__/about-scenes.test.tsx` is a known flaky-in-full-run smoke test — if only it fails, re-run it alone: `npx vitest run components/__tests__/about-scenes.test.tsx`.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke (dev server already running on :3000)** — do NOT start the server.
  - `/transporte` (as a member): enter pickup + dropoff + pet → **Elegir transportista** → picker lists businesses with `RD$` quotes (+ "aproximado" when degraded) → select one → submit shows `Solicitar · RD$ …` → trip created.
  - Chat thread with a `pet_id` → "Solicitar transporte" → lands on `/transporte` with pickup/dropoff empty (no pre-picked provider).
  - `/transporte/negocios`: allow location → cards list; deny → **Reintentar** prompt.
  - Business dashboard → Requests → a marketplace `requested` trip → **Rechazar** → status flips to Cancelado + toast (`declineTrip`); a broadcast trip still uses `cancelTrip`.

- [ ] **Step 4: Deploy note** — no migration and no API change; the backend endpoints already ship. Frontend-only deploy.

---

## Self-Review

**Spec coverage**
- Piece A (types + `quoteTrip`/`listTransportBusinesses`/`declineTrip`) → Task 1. ✔
- Piece B (addresses-first reflow, `TransportBusinessPicker`, submit `business_id`, both consumers) → Tasks 3, 4, 5. ✔ (chat consumer handled per the documented deviation)
- Piece C (`/transporte/negocios` layout+page, geolocation, "in your area", "Ver transportistas" link) → Tasks 4 (link) & 6. ✔
- Piece D (marketplace-aware decline) → Task 7. ✔
- i18n (es+en) → Task 2. ✔  Testing (3 API units + 4 UI touchpoints) → Tasks 1, 3, 4, 6, 7. ✔
- Open questions Q1–Q3 → resolved in "Decisions resolved". ✔

**Placeholder scan:** none — every step ships complete code or an exact command.

**Type consistency:** `Point`, `MarketplaceQuote`, `TripQuote`, `MarketplaceBusiness`, `Trip.business_id`, `RequestTripPayload.business_id` defined in Task 1 and used verbatim in Tasks 3/4/6/7. Function names `quoteTrip` / `listTransportBusinesses` / `declineTrip` consistent across API, components, and tests. `listTransportBusinesses` signature `{ lat, lng, from?, to?, cursor? }` matches every call site (picker passes `from`/`to`; directory omits them).
