import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { BusinessRateLine } from '@/components/transport/business-rate-line'
import { PricingSummary } from '@/lib/api/transport'

const rates = (over: Partial<PricingSummary> = {}): PricingSummary => ({
  base_fee: 150,
  per_km: 35,
  per_minute: 0,
  size_pricing_enabled: false,
  currency: 'DOP',
  ...over,
})

describe('BusinessRateLine', () => {
  it('leads with the base fee when the business publishes no minimum', () => {
    renderWithProviders(<BusinessRateLine rates={rates()} />)
    expect(screen.getByText(/Desde RD\$ 150/)).toBeInTheDocument()
    expect(screen.getByText(/RD\$ 35\/km/)).toBeInTheDocument()
  })

  it('leads with the minimum fare instead of the base when one is published', () => {
    // A floor and a base are alternative models, so the line must not read as
    // though both are charged — this is the distinction the backend column
    // exists to preserve, and it has to survive into what the member sees.
    renderWithProviders(<BusinessRateLine rates={rates({ base_fee: 0, per_km: 95, minimum_fare: 750 })} />)
    expect(screen.getByText(/Mínimo RD\$ 750/)).toBeInTheDocument()
    expect(screen.queryByText(/Desde RD\$/)).not.toBeInTheDocument()
  })

  it('omits the per-minute rate when the business bills no travel time', () => {
    // PetTransportRD and Pet PickUp both charge RD$0 for time in transit;
    // rendering "RD$ 0/min" would advertise a charge that does not exist.
    renderWithProviders(<BusinessRateLine rates={rates({ per_minute: 0 })} />)
    expect(screen.queryByText(/\/min/)).not.toBeInTheDocument()
  })

  it('shows the per-minute rate when the business does bill time', () => {
    renderWithProviders(<BusinessRateLine rates={rates({ per_minute: 8 })} />)
    expect(screen.getByText(/RD\$ 8\/min/)).toBeInTheDocument()
  })

  it('renders nothing when rates are absent rather than showing a bare "RD$"', () => {
    const { container } = renderWithProviders(<BusinessRateLine rates={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
