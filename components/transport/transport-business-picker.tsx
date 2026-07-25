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
  }, [lat, lng, from.lat, from.lng, to.lat, to.lng])

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
