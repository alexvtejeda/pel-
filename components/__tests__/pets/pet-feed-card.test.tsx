import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))

const mockUser = vi.fn(() => ({ user: null as null | { role: string }, loading: false }))
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: () => mockUser() }))

import { renderWithProviders } from '../test-utils'
import { PetFeedCard } from '@/components/pets/pet-feed-card'

const photo = (id: string) => ({ id, url: `/${id}.webp`, position: 0 })

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
    photos: [photo('a')],
    conditions: [],
    condition_notes: null,
    vaccinated: true,
    castrated: false,
    size: 'medium',
    rescue_center: { id: 'rc1', name: 'Adoptame RD' },
    ...overrides,
  }) as never

describe('PetFeedCard photos', () => {
  // Every pet in the live catalogue has exactly one photo. Mounting a carousel
  // (and its drag/animation machinery) for a single image is pure cost.
  it('renders a plain image for a single photo', () => {
    const { container } = renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Foto 1 de/ })).toBeNull()
  })

  it('renders a carousel once there is more than one photo', () => {
    renderWithProviders(
      <PetFeedCard pet={pet({ photos: [photo('a'), photo('b')] })} photoWidth={351} />,
    )

    expect(screen.getByRole('button', { name: 'Foto 1 de 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto 2 de 2' })).toBeInTheDocument()
  })

  it('falls back to the paw placeholder with no photos', () => {
    const { container } = renderWithProviders(
      <PetFeedCard pet={pet({ photos: [] })} photoWidth={351} />,
    )

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  // The width is measured once by the feed. Rendering a carousel at width 0
  // would collapse the track, so the card waits rather than guessing.
  it('does not mount a carousel before the width is measured', () => {
    renderWithProviders(
      <PetFeedCard pet={pet({ photos: [photo('a'), photo('b')] })} photoWidth={0} />,
    )

    expect(screen.queryByRole('button', { name: /Foto/ })).toBeNull()
  })

  // …but it still shows the pet. The unmeasured frame is the first one the user
  // sees, and falling through to the paw would flash an empty box over a pet
  // that has photos, then pop a carousel in on top of it.
  it('shows the first photo while the width is still unmeasured', () => {
    const { container } = renderWithProviders(
      <PetFeedCard pet={pet({ photos: [photo('a'), photo('b')] })} photoWidth={0} />,
    )

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', '/a.webp')
  })
})

describe('PetFeedCard publisher', () => {
  it('names the centre and marks it verified', () => {
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByText('Adoptame RD')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toBeInTheDocument()
  })

  it('makes the publisher row the tappable affordance when there are links', () => {
    renderWithProviders(
      <PetFeedCard
        pet={pet({ rescue_center: { id: 'rc1', name: 'Adoptame RD', website: 'adoptamerd.org' } })}
        photoWidth={351}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Enlaces de Adoptame RD' }),
    ).toBeInTheDocument()
  })

  // No links means nothing to open. A control that does nothing is worse than
  // plain text, and there is no `⋯` button on mobile to fall back to.
  it('renders plain text when the centre has no links', () => {
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.queryByRole('button', { name: /Enlaces de/ })).toBeNull()
  })

  // Member-published pets carry no author identity; a placeholder would invent one.
  it('omits the publisher row entirely when there is no centre', () => {
    renderWithProviders(<PetFeedCard pet={pet({ rescue_center: undefined })} photoWidth={351} />)

    expect(screen.queryByText('Adoptame RD')).toBeNull()
    expect(screen.queryByRole('img', { name: /verificado/ })).toBeNull()
  })
})

describe('PetFeedCard CTA', () => {
  it('invites a logged-out visitor to sign in', () => {
    mockUser.mockReturnValue({ user: null, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByRole('link', { name: 'Inicia sesión para adoptar' })).toHaveAttribute(
      'href',
      '/auth/login',
    )
  })

  it('offers Adoptar to a member', () => {
    mockUser.mockReturnValue({ user: { role: 'member' }, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByRole('button', { name: 'Adoptar' })).toBeInTheDocument()
  })

  it.each(['rescue_center', 'business'])('offers nothing to a %s account', (role) => {
    mockUser.mockReturnValue({ user: { role }, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.queryByRole('button', { name: 'Adoptar' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Inicia sesión/ })).toBeNull()
  })
})

describe('PetFeedCard facts', () => {
  it('states the facts as nouns so the copy never has to agree in gender', () => {
    mockUser.mockReturnValue({ user: null, loading: false })
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    // Whole-pill strings, not fragments: /No/ alone would also match
    // "No hay mascotas" and half the empty-state copy.
    expect(screen.getByText('Vacunas · Al día')).toBeInTheDocument()
    expect(screen.getByText('Castración · No')).toBeInTheDocument()
    expect(screen.getByText('Tamaño · Mediano')).toBeInTheDocument()
  })

  // `user_pets.size` is nullable (API migration 000039) while `pets.size` is NOT
  // NULL DEFAULT 'medium' (000016), so an absent size is reachable. Unguarded,
  // the pill would render the raw `size.undefined` key.
  it('drops the size pill when the pet has no size', () => {
    renderWithProviders(<PetFeedCard pet={pet({ size: undefined })} photoWidth={351} />)

    expect(screen.queryByText(/Tamaño/)).toBeNull()
  })

  it('surfaces the condition notes in their own block', () => {
    renderWithProviders(
      <PetFeedCard
        pet={pet({ conditions: ['sensory_blind'], condition_notes: 'Ciega del ojo izquierdo' })}
        photoWidth={351}
      />,
    )

    expect(screen.getByText('Condición especial')).toBeInTheDocument()
    expect(screen.getByText('Ciega del ojo izquierdo')).toBeInTheDocument()
  })
})

describe('PetFeedCard structure', () => {
  it('is an article labelled by the pet name', () => {
    renderWithProviders(<PetFeedCard pet={pet()} photoWidth={351} />)

    expect(screen.getByRole('article', { name: 'Abril' })).toBeInTheDocument()
  })
})
