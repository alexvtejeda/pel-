import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({ listPublicPets: vi.fn() }))

import { FeaturedPets } from '@/components/landing/featured-pets'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
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
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/es/pets')
    // Ages come from the `pets` namespace: a wrong ns renders the raw key.
    expect(screen.getAllByText('2 años')).toHaveLength(8)
    // Cards reach the grid: /pets?id= is not a route this app serves.
    expect(screen.getByRole('link', { name: /Pet 0/ })).toHaveAttribute('href', '/es/pets')
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

  // The strip had no verified badge at all, while the grid card did. Same
  // signal, same mark, everywhere a pet appears.
  it('marks centre-published pets as verified', async () => {
    mockList.mockResolvedValue({
      data: [
        pet('1', 'Luna', { rescue_center: { id: 'rc1', name: 'Refugio' } }),
        pet('2', 'Rex'),
      ],
      error: null,
    })

    renderStrip()

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(
      screen.getAllByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toHaveLength(1)
  })

  it('shows the centre avatar when the API sends one', async () => {
    mockList.mockResolvedValue({
      data: [
        pet('1', 'Luna', {
          rescue_center: { id: 'rc1', name: 'Refugio', avatar_url: 'https://cdn.test/a.jpg' },
        }),
      ],
      error: null,
    })

    const { container } = renderStrip()

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    const avatar = container.querySelector('img[src="https://cdn.test/a.jpg"]')
    expect(avatar).not.toBeNull()
    expect(avatar).toHaveAttribute('alt', '')
    expect(avatar!.className).toContain('h-[30px]')
    expect(avatar!.className).toContain('w-[30px]')
  })

  // The badge lives inside the <a> here (unlike the grid, where it is a
  // sibling of a labelled button), so without an explicit label its
  // aria-label would be absorbed into the link's accessible name.
  it('keeps the verified badge out of the link name', async () => {
    mockList.mockResolvedValue({
      data: [pet('1', 'Luna', { rescue_center: { id: 'rc1', name: 'Refugio' } })],
      error: null,
    })

    renderStrip()

    expect(await screen.findByRole('link', { name: 'Luna' })).toBeInTheDocument()
  })

  // Member-published pets carry no author identity on either surface.
  it('shows no badge and no avatar for member pets', async () => {
    mockList.mockResolvedValue({ data: [pet('1', 'Luna')], error: null })

    const { container } = renderStrip()

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows no avatar for a centre that has not uploaded one', async () => {
    mockList.mockResolvedValue({
      data: [pet('1', 'Luna', { rescue_center: { id: 'rc1', name: 'Refugio' } })],
      error: null,
    })

    const { container } = renderStrip()

    expect(await screen.findByText('Luna')).toBeInTheDocument()
    // The badge still shows — only the photo is missing.
    expect(
      screen.getByRole('img', { name: 'Publicado por un centro de rescate verificado' }),
    ).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
