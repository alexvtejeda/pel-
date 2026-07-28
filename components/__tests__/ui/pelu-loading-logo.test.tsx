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
})
