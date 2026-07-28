import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'

describe('PeluLoadingLogo', () => {
  it('renders exactly the 7 assembling pieces', () => {
    const { container } = renderWithProviders(<PeluLoadingLogo />)
    expect(container.querySelectorAll('svg path')).toHaveLength(7)
  })

  it('exposes the logo as an image with an accessible name', () => {
    renderWithProviders(<PeluLoadingLogo label="Cargando mascotas" />)
    expect(screen.getByRole('img', { name: 'Cargando mascotas' })).toBeInTheDocument()
  })

  it('falls back to the common loading label', () => {
    renderWithProviders(<PeluLoadingLogo />)
    expect(screen.getByRole('img', { name: 'Cargando...' })).toBeInTheDocument()
  })

  it('shows the label as visible text too', () => {
    renderWithProviders(<PeluLoadingLogo label="Cargando mascotas" />)
    expect(screen.getByText('Cargando mascotas')).toBeInTheDocument()
  })

  // The splinter is a 4x3px shard of the right wing. It only reads as part of
  // the wing because it flies with the exact same delta and delay; any drift
  // between the two turns it into a speck floating on its own mid-assembly.
  it('flies the splinter with the right wing on the identical delta and delay', () => {
    const { container } = renderWithProviders(<PeluLoadingLogo />)
    const paths = container.querySelectorAll('path')
    const rightWing = paths[2].getAttribute('style')
    const splinter = paths[3].getAttribute('style')

    expect(rightWing).toBe('--d: .12s; --fromX: 130px; --fromY: -30px; --fromRot: 16deg;')
    expect(splinter).toBe(rightWing)
  })

  it('applies the size prop as the rendered height', () => {
    const { container } = renderWithProviders(<PeluLoadingLogo size={64} />)
    const svg = container.querySelector('svg')

    expect(svg?.style.height).toBe('64px')
    expect(svg?.style.width).toBe('auto')
  })
})
