// components/__tests__/design-structure.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

// Mock motion/react before component imports
// Stepper imports: motion, AnimatePresence, Variants (type-only)
vi.mock('motion/react', () => {
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) =>
        React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
          const { initial, animate, exit, variants, transition, whileHover,
            whileTap, onAnimationComplete, layout, ...rest } = props
          return React.createElement(prop, { ...rest, ref })
        }),
    }
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
  }
})

import { renderWithProviders } from './test-utils'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
import Stepper, { Step } from '@/components/Stepper'
import { PetFilterBar } from '@/components/pets/pet-filters'

// ─── OnboardingNav ───────────────────────────────────────────

describe('OnboardingNav', () => {
  const items = [
    { label: 'Inicio', href: '/' },
    { label: 'Registro', href: '/auth/register' },
    { label: 'Mi perfil', current: true },
  ]

  it('1 — renders breadcrumb with all provided items', () => {
    renderWithProviders(<OnboardingNav items={items} />)
    expect(screen.getByText('Inicio')).toBeDefined()
    expect(screen.getByText('Registro')).toBeDefined()
    expect(screen.getByText('Mi perfil')).toBeDefined()
  })

  it('2 — current item is not a clickable button', () => {
    renderWithProviders(<OnboardingNav items={items} />)
    const currentItem = screen.getByText('Mi perfil')
    expect(currentItem.closest('button')).toBeNull()
  })

  it('3 — renders the Pelú logo', () => {
    renderWithProviders(<OnboardingNav items={items} />)
    const logo = screen.getByAltText(/pel[uú]/i)
    expect(logo).toBeDefined()
  })
})

// ─── Stepper ─────────────────────────────────────────────────

describe('Stepper', () => {
  function renderStepper() {
    return renderWithProviders(
      <Stepper onFinalStepCompleted={() => {}}>
        <Step>Step 1 content</Step>
        <Step>Step 2 content</Step>
        <Step>Step 3 content</Step>
      </Stepper>
    )
  }

  it('4 — renders step indicator circles matching Step children count', () => {
    const { container } = renderStepper()
    const circles = container.querySelectorAll('.rounded-full.h-8.w-8')
    expect(circles.length).toBe(3)
  })

  it('5 — next button has rounded-full and bg-pop-550', () => {
    const { container } = renderStepper()
    const nextBtn = container.querySelector('button.rounded-full.bg-pop-550')
    expect(nextBtn).not.toBeNull()
  })

  it('6 — wrapping card has rounded-2xl', () => {
    const { container } = renderStepper()
    const card = container.querySelector('.rounded-2xl')
    expect(card).not.toBeNull()
  })
})

// ─── PetFilterBar ────────────────────────────────────────────

describe('PetFilterBar', () => {
  const defaultProps = {
    activeFilter: 'dogs' as const,
    onFilterChange: () => {},
    vaccinatedFilter: false,
    onVaccinatedChange: () => {},
    castratedFilter: false,
    onCastratedChange: () => {},
    sourceFilter: 'all' as const,
    onSourceChange: () => {},
    mobileFiltersOpen: false,
    onMobileFiltersOpenChange: () => {},
  }

  // These are design-system assertions, so they check classes on purpose — but
  // reach the element by role first. `container.querySelector('.bg-pop-solid')`
  // matches two nodes (the active pill *and* the mobile trigger, which also goes
  // solid once a filter is active) and picks the pill only because the desktop
  // row happens to render first.
  it('7 — active filter pill has bg-pop-solid class', () => {
    renderWithProviders(<PetFilterBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Perros' }).className).toContain('bg-pop-solid')
  })

  // The pressed state is announced from the same condition that picks the fill.
  // Asserting both together is what stops them silently drifting apart.
  it('7b — the active pill announces aria-pressed, inactive pills do not', () => {
    renderWithProviders(<PetFilterBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Perros' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Gatos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('8 — inactive filter pills have bg-background class', () => {
    renderWithProviders(<PetFilterBar {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Gatos' }).className).toContain('bg-background')
  })
})
