import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetOwnerCard } from '@/components/pets/pet-owner-card'

const owner = (overrides: Record<string, unknown> = {}) =>
  ({ id: 'u1', display_name: 'María', email: 'maria@example.com', phone: '809-555-0134', ...overrides }) as never

describe('PetOwnerCard', () => {
  // The badge means "verified rescue centre". A private person publishing a pet
  // has not been verified by anyone, so rendering it here would be a lie.
  it('never renders the verified badge', () => {
    const { container } = renderWithProviders(<PetOwnerCard owner={owner()} />)

    // Both halves of the mark: the a11y-tree label AND the seal glyph itself.
    // `[role="img"]` alone would be useless — every Font Awesome <svg> carries it.
    expect(screen.queryByRole('img', { name: /verificad/i })).toBeNull()
    expect(container.querySelector('[data-icon="certificate"]')).toBeNull()
  })

  it('links the phone and email as real controls', () => {
    renderWithProviders(<PetOwnerCard owner={owner()} />)

    expect(screen.getByRole('link', { name: /809-555-0134/ })).toHaveAttribute('href', 'tel:809-555-0134')
    expect(screen.getByRole('link', { name: /maria@example.com/ })).toHaveAttribute('href', 'mailto:maria@example.com')
  })

  it('omits the phone row when the owner has no phone', () => {
    const { container } = renderWithProviders(<PetOwnerCard owner={owner({ phone: null })} />)

    // Query the href, not the accessible name: the link is named by the number
    // it carries, so `name: /tel:/` would be vacuously null either way.
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(screen.getByRole('link', { name: /maria@example.com/ })).toBeInTheDocument()
  })

  // `phone` is `omitempty` on the auth payload, so an unset number arrives as
  // *absent*, not null — the guard has to survive both shapes.
  it('omits the phone row when the owner carries no phone key at all', () => {
    const { container } = renderWithProviders(
      <PetOwnerCard owner={{ id: 'u1', display_name: 'María', email: 'maria@example.com' } as never} />,
    )

    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })

  // display_name is nullable and a Google sign-up can skip the wizard that sets
  // it. A blank attribution line is worse than a derived one.
  it('falls back to the email local part when there is no display name', () => {
    renderWithProviders(<PetOwnerCard owner={owner({ display_name: null })} />)

    expect(screen.getByText('maria')).toBeInTheDocument()
  })

  it('says the listing was published by a member', () => {
    renderWithProviders(<PetOwnerCard owner={owner()} />)

    expect(screen.getByText('Publicado por un miembro')).toBeInTheDocument()
  })
})
