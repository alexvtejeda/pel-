import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetGrid } from '@/components/pets/pet-grid'

const ERROR = 'Error al cargar mascotas'
const EMPTY = 'No hay mascotas disponibles'
const CLEAR = 'Limpiar filtros'
const RETRY = 'Reintentar'

const pet = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    name: 'Luna',
    age: 24,
    gender: 'female',
    species: 'dog',
    photos: [],
    conditions: [],
    ...overrides,
  }) as never

type Props = Partial<Parameters<typeof PetGrid>[0]>

function renderGrid(overrides: Props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onFilterChange: vi.fn(),
    onVaccinatedChange: vi.fn(),
    onCastratedChange: vi.fn(),
    onRetry: vi.fn(),
  }
  const utils = renderWithProviders(
    <PetGrid
      pets={[]}
      loading={false}
      error={null}
      selectedId={null}
      activeFilter="all"
      vaccinatedFilter={false}
      castratedFilter={false}
      {...handlers}
      {...overrides}
    />
  )
  return { ...utils, ...handlers }
}

describe('PetGrid error state', () => {
  it('renders the shared ErrorState with a working retry', () => {
    const { onRetry } = renderGrid({ error: 'boom' })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(ERROR)

    fireEvent.click(screen.getByRole('button', { name: RETRY }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  // A failed fetch and "there are no pets" are different facts. If the error
  // branch ever falls through to the empty state, the user is told a comforting
  // lie about the data instead of being offered a retry.
  it('does not also render the empty state', () => {
    renderGrid({ error: 'boom' })

    expect(screen.queryByText(EMPTY)).toBeNull()
    expect(screen.queryByRole('button', { name: CLEAR })).toBeNull()
  })

  it('shows the error even when a filter is active', () => {
    renderGrid({ error: 'boom', activeFilter: 'dogs' })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY)).toBeNull()
  })
})

describe('PetGrid empty state', () => {
  it('offers no clear-filters escape when nothing is filtered', () => {
    renderGrid({ pets: [] })

    expect(screen.getByText(EMPTY)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: CLEAR })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('offers a way out when a filter emptied the grid', () => {
    renderGrid({ pets: [], activeFilter: 'cats' })

    expect(screen.getByText(EMPTY)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CLEAR })).toBeInTheDocument()
  })

  it.each([
    ['vaccinated', { vaccinatedFilter: true }],
    ['castrated', { castratedFilter: true }],
  ])('offers a way out for the %s filter too', (_label, props) => {
    renderGrid({ pets: [], ...props })

    expect(screen.getByRole('button', { name: CLEAR })).toBeInTheDocument()
  })

  it('resets every filter dimension when cleared', () => {
    const { onFilterChange, onVaccinatedChange, onCastratedChange } = renderGrid({
      pets: [],
      activeFilter: 'dogs',
      vaccinatedFilter: true,
      castratedFilter: true,
    })

    fireEvent.click(screen.getByRole('button', { name: CLEAR }))

    expect(onFilterChange).toHaveBeenCalledWith('all', {})
    expect(onVaccinatedChange).toHaveBeenCalledWith(false)
    expect(onCastratedChange).toHaveBeenCalledWith(false)
  })

  // The source filter is PetGrid's own state, not a prop, and it is reachable
  // from the desktop pill row. It is the one dimension a parent-driven
  // "hasActiveFilters" would have missed — so the escape must cover it end to end.
  it('recovers the grid when the source filter emptied it', () => {
    renderGrid({ pets: [pet({ name: 'Luna' })] })

    fireEvent.click(screen.getByRole('button', { name: 'Centros' }))
    expect(screen.getByText(EMPTY)).toBeInTheDocument()
    expect(screen.queryByText('Luna')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: CLEAR }))

    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.queryByText(EMPTY)).toBeNull()
  })
})

describe('PetGrid loading state', () => {
  it('renders neither the error nor the empty state', () => {
    renderGrid({ loading: true, error: 'boom' })

    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(ERROR)).toBeNull()
    expect(screen.queryByText(EMPTY)).toBeNull()
    expect(screen.queryByRole('button', { name: CLEAR })).toBeNull()
  })
})
