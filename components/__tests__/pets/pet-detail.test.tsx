import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

import { renderWithProviders } from '../test-utils'
import { PetDetail } from '@/components/pets/pet-detail'

const pet = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'p1',
    rescue_center_id: 'rc1',
    name: 'Abril',
    description: 'Muy cariñosa',
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
    ...overrides,
  }) as never

describe('PetDetail layout', () => {
  // The rule used to separate the pet from its centre. The centre now lives in
  // a bordered card, which does that job without a second horizontal line.
  it('has no horizontal rule', () => {
    const { container } = renderWithProviders(
      <PetDetail pet={pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD' } })} />,
    )

    expect(container.querySelector('hr')).toBeNull()
  })

  // With `flex-1` the info column stretched to fill the panel and left ~330px
  // of void above the Adoptar button at a 1010px viewport.
  it('does not stretch the info column to fill the panel', () => {
    renderWithProviders(<PetDetail pet={pet()} />)

    // h2 → the title+chips group → the scrolling info column.
    const column = screen.getByRole('heading', { name: 'Abril' }).parentElement!.parentElement!
    expect(column.className).toContain('overflow-y-auto')
    expect(column.className).not.toContain('flex-1')
  })
})

describe('PetDetail facts', () => {
  // The two booleans deliberately disagree here and invert in the next case:
  // if the rows were ever cross-wired, matching values would hide it.
  it('lists the facts the payload already carries', () => {
    renderWithProviders(<PetDetail pet={pet({ vaccinated: true, castrated: false, size: 'medium' })} />)

    expect(screen.getByText('Vacunas')).toBeInTheDocument()
    expect(screen.getByText('Al día')).toBeInTheDocument()
    expect(screen.getByText('Castración')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Tamaño')).toBeInTheDocument()
    expect(screen.getByText('Mediano')).toBeInTheDocument()
  })

  // Nouns as subjects on purpose: `Vacunado`/`Castrado` are masculine and much
  // of the catalogue is female (Abril, Alma, Cangura…). The label carries the
  // noun so the value never has to agree with the pet's gender.
  it('reads each fact off its own field, ungendered', () => {
    renderWithProviders(<PetDetail pet={pet({ vaccinated: false, castrated: true, size: 'small' })} />)

    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
    expect(screen.queryByText('Vacunado')).toBeNull()
    expect(screen.queryByText('Castrado')).toBeNull()
  })
})
