import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetGrid } from '@/components/pets/pet-grid'

const ERROR = 'Error al cargar mascotas'
const EMPTY = 'No hay mascotas disponibles'
const CLEAR = 'Limpiar filtros'
const RETRY = 'Reintentar'

type Props = Partial<Parameters<typeof PetGrid>[0]>

function renderGrid(overrides: Props = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
  }
  const utils = renderWithProviders(
    <PetGrid
      pets={[]}
      loading={false}
      error={null}
      selectedId={null}
      hasActiveFilters={false}
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
    renderGrid({ error: 'boom', hasActiveFilters: true })

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

  // `hasActiveFilters` arrives as one boolean from `pets-page`, so the grid can
  // no longer tell a species filter from a health or source one. Which
  // dimensions feed that boolean is asserted where they live now — in
  // `pet-filters.test.tsx` and end to end in `pet-grid-header.test.tsx`.
  it('offers a way out when a filter emptied the grid', () => {
    renderGrid({ pets: [], hasActiveFilters: true })

    expect(screen.getByText(EMPTY)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CLEAR })).toBeInTheDocument()
  })

  it('hands the clear back to the parent that owns the filters', () => {
    const { onClearFilters } = renderGrid({ pets: [], hasActiveFilters: true })

    fireEvent.click(screen.getByRole('button', { name: CLEAR }))

    expect(onClearFilters).toHaveBeenCalledTimes(1)
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
