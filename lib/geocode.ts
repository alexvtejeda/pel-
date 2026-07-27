export interface GeoPoint {
  lat: number
  lng: number
}

/**
 * Resolves a free-text address to coordinates via Nominatim (OpenStreetMap).
 * Returns null when the address has no match or the request fails — callers
 * surface an inline field error and let the user retry.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
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
