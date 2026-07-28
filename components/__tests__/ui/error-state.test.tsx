import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ErrorState } from '@/components/ui/error-state'

describe('ErrorState', () => {
  it('renders the default translated message', () => {
    renderWithProviders(<ErrorState onRetry={() => {}} />)
    expect(screen.getByText('No pudimos cargar esto')).toBeInTheDocument()
  })

  it('renders a caller-supplied message instead', () => {
    renderWithProviders(<ErrorState message="Error al cargar mascotas" onRetry={() => {}} />)
    expect(screen.getByText('Error al cargar mascotas')).toBeInTheDocument()
    expect(screen.queryByText('No pudimos cargar esto')).not.toBeInTheDocument()
  })

  it('fires onRetry when the retry button is pressed', () => {
    const onRetry = vi.fn()
    renderWithProviders(<ErrorState onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('announces itself to assistive tech', () => {
    renderWithProviders(<ErrorState onRetry={() => {}} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('omits the retry button when no handler is given', () => {
    renderWithProviders(<ErrorState />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
