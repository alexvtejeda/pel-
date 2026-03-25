const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface UnifiedProvider {
  id: string
  user_id: string
  name: string
  type: 'business' | 'member'
  services: string[]
  description?: string
  price?: number | null
  cover_photo_url?: string | null
  operating_hours?: Record<string, { open: boolean; from: string; to: string }>
  instagram?: string
  address?: string
}

export interface ProviderFilters {
  service?: string
}

export async function listProviders(
  params?: ProviderFilters
): Promise<{ data: UnifiedProvider[] | null; error: string | null }> {
  try {
    const query = new URLSearchParams()
    if (params?.service) query.set('service', params.service)
    const qs = query.toString()
    const url = `${BASE_URL}/api/v1/providers${qs ? '?' + qs : ''}`
    const res = await fetch(url)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar proveedores' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getProvider(
  id: string
): Promise<{ data: UnifiedProvider | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/providers/${encodeURIComponent(id)}`)
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar proveedor' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
