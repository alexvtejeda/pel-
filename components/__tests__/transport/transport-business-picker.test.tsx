import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportBusinessPicker } from '@/components/transport/transport-business-picker'

vi.mock('@/lib/api/transport', () => ({
  listTransportBusinesses: vi.fn(),
  createQuote: vi.fn(),
}))
import { listTransportBusinesses, createQuote } from '@/lib/api/transport'
const mockList = vi.mocked(listTransportBusinesses)
const mockCreateQuote = vi.mocked(createQuote)

const from = { lat: 18.5, lng: -69.9 }
const to = { lat: 18.4, lng: -69.8 }

const createdQuote = {
  id: 'q1',
  number: 'COT-2026-0042',
  token: 'a'.repeat(32),
  url: `http://localhost:2701/api/v1/documents/${'a'.repeat(32)}`,
}

beforeEach(() => {
  vi.clearAllMocks()
  // clearAllMocks wipes calls but not implementations, so re-arm the happy path
  // explicitly rather than letting a previous test's rejection leak forward.
  mockCreateQuote.mockResolvedValue({ data: createdQuote, error: null })
})

describe('TransportBusinessPicker', () => {
  it('renders rows with quote, degraded label, and paginates via next_cursor', async () => {
    mockList
      .mockResolvedValueOnce({ data: { items: [
        { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2,
          quote: { distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: true, priced_from: 'size' as const } },
      ], next_cursor: 'c2' }, error: null })
      .mockResolvedValueOnce({ data: { items: [
        { business_id: 'b2', name: 'FastPaws', phone: '829', distance_from_member_km: 5.1,
          quote: { distance_km: 14, duration_minutes: 26, estimated_price: 500, routing_degraded: false, priced_from: 'size' as const } },
      ], next_cursor: '' }, error: null })

    const onSelect = vi.fn()
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={onSelect}
        lat={from.lat} lng={from.lng} from={from} to={to}
        pickupAddress="Calle A 1" dropoffAddress="Calle B 2" />
    )

    expect(await screen.findByText('PetGo')).toBeInTheDocument()
    expect(screen.getByText('RD$ 450')).toBeInTheDocument()
    expect(screen.getByText('(aproximado)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cargar más'))
    expect(await screen.findByText('FastPaws')).toBeInTheDocument()
    expect(screen.getByText('PetGo')).toBeInTheDocument() // appended, not replaced
    expect(screen.queryByText('Cargar más')).toBeNull()

    fireEvent.click(screen.getByText('PetGo'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'b1' }))
  })

  /*
    The backend applies the size surcharge inside the fan-out, so these params are
    the only thing making the picker's price match the confirmation's. Drop them
    and every row is priced bandless while the next screen is priced banded.
  */
  it('passes size and weight to the marketplace fan-out', async () => {
    mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to}
        pickupAddress="Calle A 1" dropoffAddress="Calle B 2" size="large" weightLb={80} />
    )

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ size: 'large', weight_lb: 80 }),
      ),
    )
  })

  it('omits weight for a pet that has none, keeping size', async () => {
    mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to}
        pickupAddress="Calle A 1" dropoffAddress="Calle B 2" size="small" />
    )

    await waitFor(() => expect(mockList).toHaveBeenCalled())
    const arg = mockList.mock.calls[0][0]
    expect(arg.size).toBe('small')
    expect(arg.weight_lb).toBeUndefined()
  })

  it('refetches when the selected pet changes the band', async () => {
    mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
    const { rerender } = renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to}
        pickupAddress="Calle A 1" dropoffAddress="Calle B 2" size="small" />
    )
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1))

    rerender(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to}
        pickupAddress="Calle A 1" dropoffAddress="Calle B 2" size="large" />
    )

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
    expect(mockList.mock.calls[1][0].size).toBe('large')
  })

  /*
    The document is a deliberate, numbered artifact. These tests hold the line on
    the two rules that make it one: only the explicit button creates it, and a
    failed creation never opens a tab.
  */
  describe('requesting a cotización', () => {
    const oneBusiness = {
      data: {
        items: [
          { business_id: 'b1', name: 'PetGo', phone: '809', distance_from_member_km: 3.2,
            quote: { distance_km: 12, duration_minutes: 22, estimated_price: 450, routing_degraded: false, priced_from: 'size' as const } },
        ],
        next_cursor: '',
      },
      error: null,
    }

    function renderPicker(props: Record<string, unknown> = {}) {
      mockList.mockResolvedValue(oneBusiness)
      return renderWithProviders(
        <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
          lat={from.lat} lng={from.lng} from={from} to={to}
          pickupAddress="Calle A 1" dropoffAddress="Calle B 2"
          petName="Max" size="large" weightLb={80} {...props} />
      )
    }

    const clickQuote = async () =>
      fireEvent.click((await screen.findAllByRole('button', { name: /Solicitar cotizaci[óo]n/ }))[0])

    it('creates a cotización for the row that was clicked', async () => {
      renderPicker()
      await clickQuote()
      await waitFor(() =>
        expect(mockCreateQuote).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'b1' })),
      )
    })

    /*
      The backend 400s without both addresses, and they are not derivable from the
      coordinates. Asserting only on business_id would let the picker ship with
      every real click failing while this suite stayed green.
    */
    it('sends both addresses and the pet context the document prints', async () => {
      renderPicker()
      await clickQuote()
      await waitFor(() => expect(mockCreateQuote).toHaveBeenCalled())
      expect(mockCreateQuote).toHaveBeenCalledWith(expect.objectContaining({
        pickup_address: 'Calle A 1',
        dropoff_address: 'Calle B 2',
        pet_name: 'Max',
        size: 'large',
        weight_lb: 80,
        from,
        to,
      }))
    })

    it('opens the returned document url in a new tab', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      renderPicker()
      await clickQuote()
      await waitFor(() =>
        expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/documents/'), '_blank'),
      )
      openSpy.mockRestore()
    })

    it('shows an error and does not navigate when creation fails', async () => {
      mockCreateQuote.mockResolvedValue({ data: null, error: 'boom' })
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      renderPicker()
      await clickQuote()
      expect(await screen.findByText(/boom/)).toBeInTheDocument()
      expect(openSpy).not.toHaveBeenCalled()
      openSpy.mockRestore()
    })

    it('does not create a quote merely by selecting a business', async () => {
      // Selecting must stay free. One deliberate action, one document — otherwise
      // comparing five businesses issues five numbered cotizaciones.
      const onSelect = vi.fn()
      renderPicker({ onSelect })
      fireEvent.click(await screen.findByText('PetGo'))
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ business_id: 'b1' }))
      expect(mockCreateQuote).not.toHaveBeenCalled()
    })

    it('requesting a quote does not also select the business', async () => {
      // The row is clickable for selection, so the button must stop propagation
      // or one click would both select and fire the confirmation quote.
      const onSelect = vi.fn()
      renderPicker({ onSelect })
      await clickQuote()
      await waitFor(() => expect(mockCreateQuote).toHaveBeenCalled())
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  it('shows the empty state when no businesses serve the area', async () => {
    mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to}
        pickupAddress="Calle A 1" dropoffAddress="Calle B 2" />
    )
    expect(await screen.findByText('No hay transportistas en tu zona por ahora')).toBeInTheDocument()
  })
})
