import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))
vi.mock('@/lib/hooks/use-media-query', () => ({ useMediaQuery: () => true }))
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({ status: 'idle', type: null }),
}))

import { PetsPage } from '@/components/pets/pets-page'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string) =>
  ({ id, name, age: 24, gender: 'female', species: 'dog', photos: [], conditions: [] }) as never

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
})
