import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

// The empty state's CTA is a TransitionLink, which reads the route-transition
// context. Stub it so the empty branch can render outside the provider tree.
vi.mock('@/components/transitions/route-transition-context', () => ({
  useRouteTransition: () => ({ status: 'idle', type: null, navigate: vi.fn() }),
}))

import { ProviderGrid } from '@/components/aliados/provider-grid'
import { UnifiedProvider } from '@/lib/api/providers'

const provider = (id: string, name: string, services: string[]): UnifiedProvider => ({
  id, user_id: `u${id}`, name, type: 'member', services, price: 1500,
})

const PROVIDERS = [
  provider('1', 'Transporte RD', ['transport']),
  provider('2', 'Baños Luna', ['grooming', 'pet_sitting']),
]

const baseProps = {
  providers: PROVIDERS,
  loading: false,
  error: null,
  selectedId: null,
  onSelect: () => {},
  onRetry: () => {},
}

describe('ProviderGrid', () => {
  // Scoped to the cards on purpose: the filter pills carry the same labels, so an
  // unscoped getByText('Transporte') matches both the pill and the badge.
  it('translates service badges instead of showing raw backend strings', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)

    const transportCard = screen.getByRole('button', { name: /Transporte RD/ })
    expect(within(transportCard).getByText('Transporte')).toBeInTheDocument()

    const groomingCard = screen.getByRole('button', { name: /Baños Luna/ })
    expect(within(groomingCard).getByText('Cuidado de mascotas')).toBeInTheDocument()
    expect(screen.queryByText('pet_sitting')).not.toBeInTheDocument()
  })

  it('filters the grid when a service pill is pressed', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)
    expect(screen.getByText('Transporte RD')).toBeInTheDocument()
    expect(screen.getByText('Baños Luna')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Peluquería' }))

    expect(screen.queryByText('Transporte RD')).not.toBeInTheDocument()
    expect(screen.getByText('Baños Luna')).toBeInTheDocument()
  })

  it('marks the active pill with aria-pressed', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Peluquería' }))
    expect(screen.getByRole('button', { name: 'Peluquería' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows an error state with retry instead of the raw API string', () => {
    const onRetry = vi.fn()
    renderWithProviders(
      <ProviderGrid {...baseProps} providers={[]} error="dial tcp 127.0.0.1:2701: connect: refused" onRetry={onRetry} />
    )
    expect(screen.getByText('No pudimos cargar los aliados')).toBeInTheDocument()
    expect(screen.queryByText(/dial tcp/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('restores the full list and moves aria-pressed back when "Todos" is pressed', () => {
    renderWithProviders(<ProviderGrid {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Transporte' }))
    expect(screen.queryByText('Baños Luna')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))

    expect(screen.getByText('Transporte RD')).toBeInTheDocument()
    expect(screen.getByText('Baños Luna')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Transporte' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers a way out of an over-filtered empty state', () => {
    renderWithProviders(<ProviderGrid {...baseProps} providers={[PROVIDERS[0]]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hospedaje' }))

    expect(screen.getByText('No hay aliados registrados aún')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(screen.getByText('Transporte RD')).toBeInTheDocument()
  })

  it('degrades an untranslated service value to the raw string, not a translation key', () => {
    renderWithProviders(
      <ProviderGrid {...baseProps} providers={[provider('9', 'Rarito', ['pet_taxidermy'])]} />
    )
    expect(screen.getByText('pet_taxidermy')).toBeInTheDocument()
    expect(screen.queryByText(/service_providers\.services/)).not.toBeInTheDocument()
  })

  it('renders the skeleton while loading, with neither the error nor the empty state', () => {
    const { container } = renderWithProviders(
      <ProviderGrid {...baseProps} providers={[]} loading error="boom" />
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('No hay aliados registrados aún')).not.toBeInTheDocument()
  })

  it('announces the visible count in a live region that stays mounted', () => {
    const { container, rerender } = renderWithProviders(
      <ProviderGrid {...baseProps} loading error={null} />
    )
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).toBeInTheDocument()
    expect(live).toHaveTextContent('')

    rerender(<ProviderGrid {...baseProps} />)
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('2 aliados disponibles')

    fireEvent.click(screen.getByRole('button', { name: 'Transporte' }))
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('1 aliado disponible')
  })

  // pop-solid, not pop-550: a selection indicator has to clear WCAG 1.4.11's 3:1
  // and pop-550 is 2.27:1 on the light card.
  it('rings only the selected card, in an AA-safe colour', () => {
    renderWithProviders(<ProviderGrid {...baseProps} selectedId="2" />)

    expect(screen.getByRole('button', { name: /Baños Luna/ })).toHaveClass('outline-pop-solid')
    expect(screen.getByRole('button', { name: /Transporte RD/ })).not.toHaveClass('outline-pop-solid')
  })

  it('does not add a second banner landmark on top of the public header', () => {
    const { container } = renderWithProviders(<ProviderGrid {...baseProps} />)
    expect(container.querySelector('header')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Aliados' })).toBeInTheDocument()
  })
})
