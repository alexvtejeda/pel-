import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))
vi.mock('@/lib/hooks/use-media-query', () => ({ useMediaQuery: () => true }))
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({ status: 'idle', type: null }),
}))

import { PetsPage } from '@/components/pets/pets-page'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string, overrides: Record<string, unknown> = {}) =>
  ({
    id,
    name,
    age: 24,
    gender: 'female',
    species: 'dog',
    photos: [],
    conditions: [],
    ...overrides,
  }) as never

beforeEach(() => vi.clearAllMocks())

describe('PetsPage header', () => {
  it('renders an h1 and a live result count', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna'), pet('2', 'Rex')], error: null })

    renderWithProviders(<PetsPage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mascotas en adopción' })
    ).toBeInTheDocument()
    expect(await screen.findByText('2 mascotas buscando hogar')).toBeInTheDocument()
  })

  it('does not add a second banner landmark (the layout header owns it)', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('uses the singular form for one result', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByText('1 mascota buscando hogar')).toBeInTheDocument()
  })

  it('uses the plural form for zero results', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByText('0 mascotas buscando hogar')).toBeInTheDocument()
  })

  it('keeps the live region mounted while loading so changes are announced', () => {
    mockList.mockReturnValue(new Promise(() => {}) as never)

    const { container } = renderWithProviders(<PetsPage />)

    const live = container.querySelector('[aria-live="polite"]')
    expect(live).not.toBeNull()
    expect(live).toHaveTextContent('')
  })

  it('does not report a count when the load fails', async () => {
    mockList.mockResolvedValue({ data: null, error: 'boom' })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByText(/buscando hogar/)).toBeNull()
  })

  // The clear button lives in the grid's empty state and the popover lives in
  // the filter bar — two components either side of `pets-page`. This is the
  // only test that exercises the whole path rather than one half of it.
  it('clears every filter dimension from the empty state', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vacunado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Castrado' }))
    fireEvent.click(screen.getByRole('button', { name: 'Centros' }))
    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Vacunado' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Castrado' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Centros' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
  })

  // The source filter used to be `PetGrid`'s own state, so the page counted
  // before the grid filtered and the two disagreed whenever "Centros" was on.
  // One derivation upstream is what makes the count and the cards agree.
  it('narrows both the card list and the announced count with the source filter', async () => {
    mockList.mockResolvedValue({
      data: [pet('1', 'Luna', { rescue_center: { id: 'rc1', name: 'Refugio' } }), pet('2', 'Rex')],
      error: null,
    })

    renderWithProviders(<PetsPage />)
    await screen.findByText('2 mascotas buscando hogar')

    fireEvent.click(screen.getByRole('button', { name: 'Centros' }))

    expect(screen.getByText('1 mascota buscando hogar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver detalles de Luna' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver detalles de Rex' })).toBeNull()
  })

  // The full round trip: a populated grid driven to zero and back. `visiblePets`
  // and `handleClearFilters`' `setSourceFilter('all')` only pair up here —
  // narrowing without reaching zero, or clearing a list that was empty all
  // along, would each still pass with half of that wiring broken.
  it('empties the grid with the source filter and brings the pets back on clear', async () => {
    // Member-published only (no `rescue_center`), so "Centros" hides every card.
    mockList.mockResolvedValue({ data: [pet('1', 'Rex'), pet('2', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('button', { name: 'Ver detalles de Rex' })

    fireEvent.click(screen.getByRole('button', { name: 'Centros' }))

    expect(screen.getByText('No hay mascotas disponibles')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver detalles de Rex' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ver detalles de Luna' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(await screen.findByRole('button', { name: 'Ver detalles de Rex' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver detalles de Luna' })).toBeInTheDocument()
    expect(screen.queryByText('No hay mascotas disponibles')).toBeNull()
  })

  // The API returns no guaranteed order, and this sort is now a contract between
  // two components rather than one component's private detail: the feed shows one
  // pet per screen, so the order is far more visible there than in a grid. The
  // fixture is deliberately reversed — in API order the assertion would pass with
  // the sort deleted entirely.
  it('puts centre-published pets before member ones whatever order the API sends', async () => {
    mockList.mockResolvedValue({
      data: [
        pet('1', 'Rex'),
        pet('2', 'Luna', { rescue_center: { id: 'rc1', name: 'Adoptame RD' } }),
      ],
      error: null,
    })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('button', { name: 'Ver detalles de Luna' })

    const order = screen
      .getAllByRole('button', { name: /^Ver detalles de/ })
      .map(b => b.getAttribute('aria-label'))

    expect(order).toEqual(['Ver detalles de Luna', 'Ver detalles de Rex'])
  })

  // Was a real bug: the health toggles had their own fetch effect that only ever
  // sent the two health params, so toggling one dropped the active species from
  // the query. The user got dogs back under a "Gatos" pill still reading
  // aria-pressed="true" — the pill and the grid disagreed, silently.
  it('keeps the active species when a health filter is toggled', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))
    mockList.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Vacunado' }))

    expect(mockList).toHaveBeenCalledWith({ species: 'cat', vaccinated: true })
    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'true')
  })

  // Also a real bug: clearing used to fire twice — once from a closure still
  // holding the old health values, once from the effect reacting to those values
  // changing. `fetchPets` has no sequencing, so the stale response landing last
  // would repopulate the grid under freshly-cleared pills.
  it('sends exactly one unfiltered request when filters are cleared', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vacunado' }))
    mockList.mockClear()

    fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }))

    expect(mockList).toHaveBeenCalledTimes(1)
    expect(mockList).toHaveBeenCalledWith({})
  })
})
