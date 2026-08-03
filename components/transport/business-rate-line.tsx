'use client'

import { useTranslation } from 'react-i18next'
import { PricingSummary } from '@/lib/api/transport'

interface BusinessRateLineProps {
  rates?: PricingSummary
  /**
   * When the row already shows a quoted total, the rate card is supporting
   * detail and is rendered quieter. When there is no quote — the browse page,
   * or a row whose route could not be priced — it is the only price the member
   * gets, so it carries normal weight.
   */
  subdued?: boolean
  className?: string
}

/**
 * A business's advertised rates, e.g. "Desde RD$750 · RD$95/km".
 *
 * Shared by the picker and the browse page on purpose: these two surfaces
 * quoting the same business differently is exactly the confusion this feature
 * was built to remove.
 *
 * The leading figure is the minimum fare when the business publishes one and
 * the base fee otherwise, because those are alternative pricing models rather
 * than two charges — a business with a floor does not also add its base to it.
 */
export function BusinessRateLine({ rates, subdued = false, className = '' }: BusinessRateLineProps) {
  const { t } = useTranslation('transport')
  if (!rates) return null

  // A floor and a base are mutually exclusive in practice; show whichever the
  // business actually prices from rather than implying both are charged.
  const lead = rates.minimum_fare != null
    ? t('marketplace.rate_minimum', { price: Math.round(rates.minimum_fare) })
    : t('marketplace.rate_from', { price: Math.round(rates.base_fee) })

  const parts = [lead, t('marketplace.rate_per_km', { price: Math.round(rates.per_km) })]
  // Omitted at zero rather than shown as "RD$0/min": operators who bill no
  // travel time (the common case) would otherwise advertise a charge of zero.
  if (rates.per_minute > 0) {
    parts.push(t('marketplace.rate_per_minute', { price: Math.round(rates.per_minute) }))
  }

  return (
    <p className={`${subdued ? 'text-xs text-muted-foreground' : 'text-sm font-medium'} ${className}`}>
      {parts.join(' · ')}
    </p>
  )
}
