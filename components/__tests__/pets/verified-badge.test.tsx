import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { VerifiedBadge } from '@/components/pets/verified-badge'

const LABEL = 'Publicado por un centro de rescate verificado'

describe('VerifiedBadge', () => {
  it('announces itself once, as a single image', () => {
    renderWithProviders(<VerifiedBadge />)

    const badge = screen.getByRole('img', { name: LABEL })
    // Two glyphs, one accessible node: the check is decoration on the seal.
    expect(badge.querySelectorAll('svg')).toHaveLength(2)
  })

  it('takes its size from the caller', () => {
    renderWithProviders(<VerifiedBadge className="text-xl" />)

    expect(screen.getByRole('img', { name: LABEL })).toHaveClass('text-xl')
  })

  // The badge sits on photos in the grid and the landing strip, and on a flat
  // muted card in the sheet. Only the first needs separation from the image.
  it('only carries the photo drop shadow when asked', () => {
    const { unmount } = renderWithProviders(<VerifiedBadge />)
    expect(screen.getByRole('img', { name: LABEL }).className).not.toContain('drop-shadow')
    unmount()

    renderWithProviders(<VerifiedBadge onPhoto />)
    expect(screen.getByRole('img', { name: LABEL }).className).toContain('drop-shadow-[')
  })
})
