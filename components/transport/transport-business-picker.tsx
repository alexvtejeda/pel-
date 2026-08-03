'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faLocationDot, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listTransportBusinesses, createQuote, MarketplaceBusiness, Point } from '@/lib/api/transport'
import { BusinessRateLine } from './business-rate-line'

interface TransportBusinessPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (business: MarketplaceBusiness) => void
  lat: number
  lng: number
  from: Point
  to: Point
  /**
   * Required, not optional: `POST /quotes` prints both addresses on the document
   * and rejects a body without them with a 400. They cannot be derived from the
   * coordinates, so they are typed required to make it a compile error for the
   * creation form to stop threading them down.
   */
  pickupAddress: string
  dropoffAddress: string
  /** Printed on the document; purely descriptive, so both stay optional. */
  petName?: string
  petSpecies?: string
  /**
   * The selected pet's pricing inputs. Without them every row is quoted bandless
   * while the confirmation screen quotes the same trip with the size surcharge
   * applied, and the price visibly jumps between the two screens.
   */
  size?: string
  weightLb?: number
}

export function TransportBusinessPicker({ open, onOpenChange, onSelect, lat, lng, from, to, pickupAddress, dropoffAddress, petName, petSpecies, size, weightLb }: TransportBusinessPickerProps) {
  const { t } = useTranslation('transport')
  const [items, setItems] = useState<MarketplaceBusiness[]>([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotingFor, setQuotingFor] = useState<string | null>(null)
  const [quoteError, setQuoteError] = useState<{ id: string; message: string } | null>(null)

  /**
   * Only this deliberate action mints a document. Selecting a business stays
   * free, so comparing five businesses does not issue five numbered cotizaciones.
   */
  const handleRequestQuote = async (b: MarketplaceBusiness) => {
    setQuotingFor(b.business_id)
    setQuoteError(null)
    const { data, error: err } = await createQuote({
      business_id: b.business_id,
      from,
      to,
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
      pet_name: petName,
      pet_species: petSpecies,
      size,
      weight_lb: weightLb,
    })
    setQuotingFor(null)
    if (err || !data) {
      setQuoteError({ id: b.business_id, message: err || t('marketplace.quote_error') })
      return
    }
    window.open(data.url, '_blank')
  }

  const load = useCallback(async (nextCursor?: string) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listTransportBusinesses({
      lat, lng, from, to, cursor: nextCursor, size, weight_lb: weightLb,
    })
    setLoading(false)
    if (err || !data) { setError(err || 'Error'); return }
    setItems(prev => (nextCursor ? [...prev, ...data.items] : data.items))
    setCursor(data.next_cursor)
    // size/weightLb are dependencies: switching to a pet in another band has to
    // re-price the list, not keep showing the previous pet's prices.
  }, [lat, lng, from.lat, from.lng, to.lat, to.lng, size, weightLb])

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
              /*
                A div with a button role, not a <button>: the quote action below
                is itself a button, and interactive content may not nest inside a
                <button>. Keyboard activation is restored by hand so the row stays
                reachable exactly as it was.
              */
              <div
                key={b.business_id}
                role="button"
                tabIndex={0}
                /* Without an explicit name the row's accessible name is every
                   descendant's text, swallowing the quote button's label. */
                aria-label={b.name}
                onClick={() => onSelect(b)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(b)
                  }
                }}
                className="w-full text-left rounded-2xl border bg-card p-4 cursor-pointer hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-500"
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

                {/*
                  Subdued when a quoted total is already shown above, since the
                  total is the number the member acts on; primary when there is
                  no quote, where these rates are the only price on the row.
                */}
                <BusinessRateLine rates={b.rates} subdued={!!b.quote} className="mt-1" />

                {/* Secondary action: subordinate to selecting the row, which stays
                    the primary action of the card. */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleRequestQuote(b) }}
                  disabled={quotingFor === b.business_id}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-input px-3 py-2 text-xs font-medium hover:bg-accent/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  <FontAwesomeIcon
                    icon={quotingFor === b.business_id ? faSpinner : faFileInvoiceDollar}
                    className={`text-xs mr-1.5 ${quotingFor === b.business_id ? 'animate-spin' : ''}`}
                  />
                  {quotingFor === b.business_id
                    ? t('marketplace.quote_loading')
                    : t('marketplace.request_quote')}
                </button>

                {quoteError?.id === b.business_id && (
                  <p role="alert" className="mt-2 text-xs text-destructive">{quoteError.message}</p>
                )}
              </div>
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
