import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface DayHours {
  open: boolean
  from: string   // "09:00"
  to: string     // "18:00"
}

export interface OperatingHours {
  monday?: DayHours
  tuesday?: DayHours
  wednesday?: DayHours
  thursday?: DayHours
  friday?: DayHours
  saturday?: DayHours
  sunday?: DayHours
}

/**
 * Canonical business service keys — keep in sync with internal/business/services.go,
 * which rejects anything outside this list on both POST and PATCH.
 *
 * Deliberately NOT the same list as SERVICE_TYPES in ./service-providers. That one is
 * the *service provider* contract (validated by internal/serviceproviders/repository.go)
 * and carries no veterinary/other/pet_taxi — offering those in the provider form would
 * produce a checkbox the provider endpoint 400s on. Businesses validate against a superset.
 */
export const BUSINESS_SERVICE_TYPES = [
  'transport',
  'pet_taxi',
  'grooming',
  'pet_sitting',
  'dog_walking',
  'pet_boarding',
  'training',
  'veterinary',
  'other',
] as const

export type BusinessServiceType = (typeof BUSINESS_SERVICE_TYPES)[number]

/** The pet-taxi marketplace opt-in key. See PET_TAXI_SERVICE's note below. */
export const PET_TAXI_SERVICE: BusinessServiceType = 'pet_taxi'

/**
 * The keys offered as ordinary service checkboxes.
 *
 * `pet_taxi` is excluded on purpose: `transport` is the directory tag ("I move pets"),
 * while `pet_taxi` means "priced, quote-driven, accepts targeted trips". The backend
 * lists a business in the marketplace only when it carries `pet_taxi` *and* a non-NULL
 * taxi_base_fee, so it belongs with the pricing fields, not among the plain tags.
 */
export const BUSINESS_SERVICE_OPTIONS = BUSINESS_SERVICE_TYPES.filter(
  (s) => s !== PET_TAXI_SERVICE,
)

export interface Business {
  id: string
  user_id: string
  name: string
  phone: string
  address: string
  rnc?: string
  instagram?: string
  description?: string
  services: string[]
  other_service: string | null
  operating_hours?: OperatingHours
  cover_photo_url?: string
  price?: number | null
  /**
   * Pet-taxi pricing overrides, in DOP. Serialized `omitempty`, so an absent field
   * means NULL — "use the platform QUOTE_DEFAULT_* fallback" — which is distinct
   * from an explicit 0.
   */
  taxi_base_fee?: number | null
  taxi_per_km?: number | null
  taxi_per_minute?: number | null
  /**
   * Size-band pricing. The toggle is serialized without `omitempty` and is always
   * present in a response, because `false` is meaningful — it is the opted-out
   * default, not a missing value. The three surcharges are `omitempty`, so an
   * absent one means "use the platform default", NOT "free". Same distinction the
   * taxi_* fees above already carry.
   */
  taxi_size_pricing_enabled?: boolean
  taxi_surcharge_small?: number | null
  taxi_surcharge_medium?: number | null
  taxi_surcharge_large?: number | null
  terms_and_conditions?: string | null
  status: string
  rejection_reason?: string
}

export interface CreateBusinessInput {
  name: string
  phone: string
  address: string
  rnc?: string
  instagram?: string
  description?: string
  services: string[]
  other_service?: string
  operating_hours?: OperatingHours
}

export async function createBusiness(
  data: CreateBusinessInput,
): Promise<{ data: Business | null; error: string | null }> {
  const res = await apiClient('/api/v1/businesses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear negocio' }
  return { data: json, error: null }
}

export async function getMyBusiness(): Promise<{ data: Business | null; error: string | null }> {
  const res = await apiClient('/api/v1/businesses/me')
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al obtener negocio' }
  return { data: json, error: null }
}

/**
 * Partial update payload. Omitted fields are left untouched by the backend.
 *
 * Note the backend applies every column with `COALESCE($n, column)`, so sending an
 * explicit `null` is a no-op, not a clear — there is no way to unset a fee once
 * written. Opting back out of the marketplace is done by dropping `pet_taxi` from
 * `services`, which de-lists the business regardless of what the fees still hold.
 */
export interface UpdateBusinessInput extends Partial<CreateBusinessInput> {
  price?: number | null
  taxi_base_fee?: number
  taxi_per_km?: number
  taxi_per_minute?: number
  taxi_size_pricing_enabled?: boolean
  /**
   * Send a surcharge only when it carries a value. Omitting one leaves the stored
   * value untouched (COALESCE, see above) and an unset band falls back to the
   * platform default — whereas an explicit 0 means "this band is free".
   */
  taxi_surcharge_small?: number
  taxi_surcharge_medium?: number
  taxi_surcharge_large?: number
  terms_and_conditions?: string
}

export async function updateBusiness(
  data: UpdateBusinessInput,
): Promise<{ data: Business | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/businesses/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar negocio' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function uploadBusinessPhoto(
  file: File,
): Promise<{ data: { url: string } | null; error: string | null }> {
  const form = new FormData()
  form.append('photo', file)

  const res = await fetch(`${BASE_URL}/api/v1/businesses/me/photo`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al subir foto' }
  return { data: json, error: null }
}
