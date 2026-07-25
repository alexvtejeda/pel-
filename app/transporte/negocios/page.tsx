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
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

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
    setError(null)
    const { data, error: err } = await listTransportBusinesses({ lat: coords.lat, lng: coords.lng, cursor: nextCursor })
    setLoading(false)
    setLoaded(true)
    if (err || !data) { setError(err || 'Error'); return }
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
          {loading && items.length === 0 && (
            <div className="flex justify-center py-16">
              <FontAwesomeIcon icon={faSpinner} className="text-2xl text-muted-foreground animate-spin" />
            </div>
          )}
          {error && items.length === 0 && (
            <p className="text-destructive text-sm text-center py-16">{error}</p>
          )}
          {loaded && !loading && !error && items.length === 0 && (
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
