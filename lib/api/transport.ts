import { apiClient } from './client'

export type TripStatus = 'requested' | 'accepted' | 'picking_up' | 'in_transit' | 'completed' | 'cancelled'

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
  /** Exactly one of pet_id (rescue center, `pets`) and user_pet_id (member, `user_pets`) is set. */
  pet_id?: string | null
  user_pet_id?: string | null
  status: TripStatus
  stops: TripStop[]
  created_at: string
  updated_at: string
  pet_description?: string
  target_driver_id?: string | null
  business_id?: string | null
  conversation_id?: string | null
  requester_name?: string
  pet_name?: string
  pet_photo_url?: string
  pet_species?: string
  pet_breed?: string
}

export interface DriverLocation {
  trip_id: string
  lat: number
  lng: number
  eta_minutes: number | null
}

export interface Point {
  lat: number
  lng: number
}

/**
 * What selected the pricing band. `'size'` is NOT a degraded case — it is how most
 * operators price, so only `'none'` (nothing to go on) warrants an estimate badge.
 * `'disabled'` means the business does not charge by size at all.
 *
 * Independent of `routing_degraded`, which means the routing service failed: a
 * quote can be both, either, or neither.
 */
export type PricedFrom = 'weight' | 'size' | 'none' | 'disabled'

export interface MarketplaceQuote {
  distance_km: number
  duration_minutes: number
  estimated_price: number
  routing_degraded: boolean
  priced_from: PricedFrom
}

export interface TripQuote {
  business_id: string
  distance_km: number
  duration_minutes: number
  estimated_price: number
  routing_degraded: boolean
  routing_source: string
  currency: string
  priced_from: PricedFrom
}

/**
 * A business's advertised rate card, independent of any route.
 *
 * Every number is the RESOLVED effective rate: a business that leaves a column
 * NULL is charged the platform default, and the backend reports that default
 * rather than null. Do not reintroduce a nullable-rate path here — rendering
 * "—" for a rate the business really does charge is the bug this shape exists
 * to prevent.
 */
export interface PricingSummary {
  base_fee: number
  per_km: number
  per_minute: number
  /**
   * A price FLOOR, not a base fee: the total becomes `max(minimum_fare, …)`
   * rather than having this added to it. Optional because publishing no floor
   * is a real configuration and must not render as "RD$0".
   */
  minimum_fare?: number
  size_pricing_enabled: boolean
  currency: string
}

export interface MarketplaceBusiness {
  business_id: string
  name: string
  phone: string
  cover_photo_url?: string
  operating_hours?: string
  distance_from_member_km: number
  /** Always present from `GET /transport/businesses` — unlike `quote`, it needs no route. */
  rates?: PricingSummary
  quote?: MarketplaceQuote
}

interface RequestTripPayload {
  /** Send exactly one: pet_id for a rescue center's pet, user_pet_id for a member's own. */
  pet_id?: string
  user_pet_id?: string
  pet_description?: string
  target_driver_id?: string
  business_id?: string
  pickup_address?: string
  pickup_lat?: number
  pickup_lng?: number
  stops: { address: string; lat: number; lng: number }[]
  conversation_id?: string
  rescue_center_id?: string
  /**
   * Pricing inputs. The backend re-quotes server-side from these and snapshots
   * both onto the trip, so an accepted price stays reconstructible after the pet
   * is edited. Same 0–500 bound as the quote endpoint.
   */
  weight_lb?: number
  size?: string
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

export async function listTrips(role?: string): Promise<{ data: Trip[] | null; error: string | null }> {
  try {
    const qs = role ? `?role=${encodeURIComponent(role)}` : ''
    const res = await apiClient(`/api/v1/transport${qs}`)
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

// --- Marketplace (quote / businesses / decline) ---

/**
 * `weight_lb` must stay inside 0–500 — unlike the marketplace fan-out, this
 * endpoint rejects an out-of-range weight with a 400 rather than ignoring it.
 */
export async function quoteTrip(input: {
  business_id: string
  from: Point
  to: Point
  weight_lb?: number
  size?: string
}): Promise<{ data: TripQuote | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/transport/quote', { method: 'POST', body: JSON.stringify(input) })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al calcular la cotización' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

/**
 * Pass the same `size`/`weight_lb` that will go to `quoteTrip`, so each row's
 * quote carries that business's size surcharge and the picker price matches the
 * confirmation price.
 *
 * Unlike `quoteTrip`, the backend silently ignores a malformed `size` or an
 * out-of-range `weight_lb` here instead of erroring — a bad param must never
 * blank the picker — so there is no 400 to handle.
 */
export async function listTransportBusinesses(params: {
  lat: number
  lng: number
  from?: Point
  to?: Point
  cursor?: string
  weight_lb?: number
  size?: string
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
    if (params.size) q.set('size', params.size)
    // Explicit null/undefined check: 0 is a legitimate weight and must still be sent.
    if (params.weight_lb != null) q.set('weight_lb', String(params.weight_lb))
    const res = await apiClient(`/api/v1/transport/businesses?${q.toString()}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar transportistas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// --- Quote documents (cotizaciones) ---

export interface CreatedQuote {
  id: string
  /** Human-facing document number, e.g. `COT-2026-0001`. */
  number: string
  token: string
  /** Absolute URL of the rendered document, served by the API. */
  url: string
}

export interface CreateQuoteInput {
  business_id: string
  from: Point
  to: Point
  /**
   * Both addresses are REQUIRED: the backend prints them on the document and
   * rejects a body without them with a 400 (`pickup_address is required`).
   * They are not derivable from the coordinates, so they must be threaded down
   * from the creation form rather than defaulted here.
   */
  pickup_address: string
  dropoff_address: string
  weight_lb?: number | null
  size?: string | null
  pet_name?: string
  pet_species?: string
}

/**
 * Creates a persisted cotización for ONE business. The picker's per-row prices
 * stay in-memory — only a deliberate member action produces a numbered
 * document, so comparing five businesses does not issue five of them.
 */
export async function createQuote(
  input: CreateQuoteInput,
): Promise<{ data: CreatedQuote | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/quotes', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al generar la cotización' }
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
