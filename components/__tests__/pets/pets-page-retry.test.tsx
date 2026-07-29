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

const pet = (id: string, name: string) =>
  ({ id, name, age: 24, gender: 'female', species: 'cat', photos: [], conditions: [] }) as never

beforeEach(() => vi.clearAllMocks())

describe('PetsPage retry', () => {
  it('re-runs the fetch and clears the error on success', async () => {
    mockList.mockResolvedValueOnce({ data: null, error: 'boom' })

    renderWithProviders(<PetsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Error al cargar mascotas')

    mockList.mockResolvedValueOnce({ data: [pet('1', 'Luna')], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // Retry must replay the request that failed. A bare fetchPets() would ask for
  // the unfiltered list and repopulate the grid with pets the still-active
  // "Gatos" pill claims are filtered out.
  it('replays the active filters rather than refetching everything', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<PetsPage />)
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))
    expect(await screen.findByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()

    mockList.mockResolvedValue({ data: null, error: 'boom' })
    // Re-assert the species filter so the failing request is the filtered one.
    fireEvent.click(screen.getByRole('button', { name: 'Gatos' }))
    await screen.findByRole('alert')

    mockList.mockClear()
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await screen.findByText('Luna')
    expect(mockList).toHaveBeenCalledTimes(1)
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ species: 'cat' }))
  })
})
