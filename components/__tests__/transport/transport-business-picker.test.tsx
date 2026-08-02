import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/components/__tests__/test-utils'
import { TransportBusinessPicker } from '@/components/transport/transport-business-picker'

vi.mock('@/lib/api/transport', () => ({
  listTransportBusinesses: vi.fn(),
}))
import { listTransportBusinesses } from '@/lib/api/transport'
const mockList = vi.mocked(listTransportBusinesses)

const from = { lat: 18.5, lng: -69.9 }
const to = { lat: 18.4, lng: -69.8 }

beforeEach(() => vi.clearAllMocks())

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
        lat={from.lat} lng={from.lng} from={from} to={to} />
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
        lat={from.lat} lng={from.lng} from={from} to={to} size="large" weightLb={80} />
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
        lat={from.lat} lng={from.lng} from={from} to={to} size="small" />
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
        lat={from.lat} lng={from.lng} from={from} to={to} size="small" />
    )
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1))

    rerender(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to} size="large" />
    )

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
    expect(mockList.mock.calls[1][0].size).toBe('large')
  })

  it('shows the empty state when no businesses serve the area', async () => {
    mockList.mockResolvedValue({ data: { items: [], next_cursor: '' }, error: null })
    renderWithProviders(
      <TransportBusinessPicker open onOpenChange={() => {}} onSelect={vi.fn()}
        lat={from.lat} lng={from.lng} from={from} to={to} />
    )
    expect(await screen.findByText('No hay transportistas en tu zona por ahora')).toBeInTheDocument()
  })
})
