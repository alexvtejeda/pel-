import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))

import { FeaturedPets } from '@/components/landing/featured-pets'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
import { listPublicPets } from '@/lib/api/pets-public'

const mockList = vi.mocked(listPublicPets)

const pet = (id: string, name: string) =>
  ({ id, name, age: 24, gender: 'female', species: 'dog', photos: [], conditions: [] }) as never

/*
  RouteTransitionProvider is here because the strip's links are TransitionLinks
  and useRouteTransition() throws outside the provider. The root layout wraps
  every route in it, so this mirrors production rather than papering over a
  missing provider.
*/
function renderStrip() {
  return renderWithProviders(
    <RouteTransitionProvider>
      <FeaturedPets />
    </RouteTransitionProvider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('FeaturedPets', () => {
  it('renders up to eight pets with a link to the full grid', async () => {
    mockList.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, i) => pet(String(i), `Pet ${i}`)),
      error: null,
    })

    renderStrip()

    expect(await screen.findByText('Pet 0')).toBeInTheDocument()
    expect(screen.getByText('Pet 7')).toBeInTheDocument()
    expect(screen.queryByText('Pet 8')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/pets')
    // Cards reach the grid: /pets?id= is not a route this app serves.
    expect(screen.getByRole('link', { name: /Pet 0/ })).toHaveAttribute('href', '/pets')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByTestId('featured-pets-skeleton')).toBeNull()
  })

  it('shows a placeholder grid while the request is in flight', async () => {
    mockList.mockReturnValue(new Promise(() => {}) as never)

    renderStrip()

    expect(screen.getByTestId('featured-pets-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  // listPublicPets never rejects — a dead API comes back as
  // { data: null, error: 'Error de conexión' }, which is indistinguishable from
  // an empty list unless the component branches on `error`.
  it('renders an error surface when the request fails, not an empty strip', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderStrip()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar las mascotas')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByTestId('featured-pets-skeleton')).toBeNull()
  })

  it('recovers when the retry succeeds', async () => {
    mockList.mockResolvedValueOnce({ data: null, error: 'Error de conexión' })

    renderStrip()

    expect(await screen.findByRole('alert')).toBeInTheDocument()

    mockList.mockResolvedValueOnce({ data: [pet('1', 'Luna')], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // The mirror image of the test above: no pets is not a failure, so the strip
  // steps aside instead of shouting an error on the landing page.
  it('renders nothing when there are genuinely no pets', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    const { container } = renderStrip()

    await waitFor(() => expect(container.querySelector('section')).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('No pudimos cargar las mascotas')).toBeNull()
  })
})
