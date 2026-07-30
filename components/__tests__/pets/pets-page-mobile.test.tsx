import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))
vi.mock('@/lib/api/metrics', () => ({ trackPetEvent: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))
vi.mock('@/lib/hooks/use-media-query', () => ({ useMediaQuery: () => false }))
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({ status: 'idle', type: null }),
}))

import { renderWithProviders } from '../test-utils'
import { PetsPage } from '@/components/pets/pets-page'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string) =>
  ({
    id,
    name,
    age: 24,
    gender: 'female',
    species: 'dog',
    photos: [],
    conditions: [],
    vaccinated: true,
    castrated: true,
    size: 'medium',
    rescue_center: { id: 'rc1', name: 'Adoptame RD' },
  }) as never

beforeEach(() => vi.clearAllMocks())

describe('PetsPage below 640px', () => {
  it('renders the feed, one post per pet', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna'), pet('2', 'Rex')], error: null })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByRole('article', { name: 'Luna' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Rex' })).toBeInTheDocument()
  })

  // The feed is terminal — the card already shows everything, so there is no
  // detail surface left on this breakpoint.
  it('has no drawer to open', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('article', { name: 'Luna' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('still filters from the mobile popover', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('article', { name: 'Luna' })

    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }))
    // Scoped to the popover: `PetFilterBar` renders the desktop pill row and the
    // mobile trigger together and hides one with `sm:` classes, which jsdom does
    // not apply — so an unscoped "Gatos" matches two buttons.
    const popover = screen.getByRole('group', { name: 'Filtros' })
    fireEvent.click(within(popover).getByRole('button', { name: 'Gatos' }))

    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ species: 'cat' }))
  })
})
