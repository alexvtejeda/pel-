import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

import { renderWithProviders } from '../test-utils'
import { PetFeed } from '@/components/pets/pet-feed'

const pet = (id: string, name: string) =>
  ({
    id,
    rescue_center_id: 'rc1',
    name,
    description: '',
    age: 24,
    gender: 'female',
    species: 'dog',
    status: 'available',
    short_slug: '',
    photos: [],
    conditions: [],
    condition_notes: null,
    vaccinated: true,
    castrated: true,
    size: 'medium',
  }) as never

function renderFeed(overrides: Partial<Parameters<typeof PetFeed>[0]> = {}) {
  const handlers = { onClearFilters: vi.fn(), onRetry: vi.fn() }
  const utils = renderWithProviders(
    <PetFeed
      pets={[pet('1', 'Luna')]}
      loading={false}
      error={null}
      hasActiveFilters={false}
      {...handlers}
      {...overrides}
    />,
  )
  return { ...utils, ...handlers }
}

beforeEach(() => {
  // jsdom has neither; the feed must degrade to "no rail, unmeasured width"
  // rather than throw. Tests that need them stub them explicitly.
  vi.stubGlobal('ResizeObserver', undefined)
  vi.stubGlobal('IntersectionObserver', undefined)
})

describe('PetFeed states', () => {
  // The half card is what signals "there is more below", so it is not optional.
  it('shows one and a half skeleton cards while loading', () => {
    const { container } = renderFeed({ loading: true, pets: [] })

    expect(container.querySelectorAll('[data-feed-skeleton]')).toHaveLength(2)
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('shows the retryable error state', () => {
    const { onRetry } = renderFeed({ error: 'boom', pets: [] })

    expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar mascotas')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('offers the clear-filters escape hatch only when filters are active', () => {
    const { unmount } = renderFeed({ pets: [] })
    expect(screen.getByText('No hay mascotas disponibles')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
    unmount()

    const { onClearFilters } = renderFeed({ pets: [], hasActiveFilters: true })
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(onClearFilters).toHaveBeenCalled()
  })

  it('renders one post per pet', () => {
    renderFeed({ pets: [pet('1', 'Luna'), pet('2', 'Rex')] })

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('article', { name: 'Luna' })).toBeInTheDocument()
  })
})

describe('PetFeed position rail', () => {
  it('marks the feed for the root-level snap rule', () => {
    const { container } = renderFeed()

    expect(container.querySelector('[data-pet-feed]')).not.toBeNull()
  })

  it('draws one dash per pet and hides the rail from assistive tech', () => {
    const { container } = renderFeed({ pets: [pet('1', 'Luna'), pet('2', 'Rex')] })

    const rail = container.querySelector('[data-feed-rail]')!
    expect(rail).toHaveAttribute('aria-hidden', 'true')
    expect(rail.querySelectorAll('[data-feed-dash]')).toHaveLength(2)
  })

  // Past 30 the dashes stop being individually legible, so the rail degrades to
  // a counter rather than a smear.
  it('degrades to a counter above 30 pets', () => {
    const many = Array.from({ length: 31 }, (_, i) => pet(String(i), `Pet ${i}`))
    const { container } = renderFeed({ pets: many })

    expect(container.querySelectorAll('[data-feed-dash]')).toHaveLength(0)
    expect(screen.getByText('1/31')).toBeInTheDocument()
  })

  it('shows no rail for a single pet', () => {
    const { container } = renderFeed()

    expect(container.querySelector('[data-feed-rail]')).toBeNull()
  })
})
