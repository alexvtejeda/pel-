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
import { PetGrid } from '@/components/pets/pet-grid'

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

// ─── PetGrid ─────────────────────────────────────────────────

describe('PetGrid', () => {
  const defaultProps = {
    pets: [],
    loading: false,
    error: null,
    selectedId: null,
    activeFilter: 'dogs' as const,
    onSelect: () => {},
    onFilterChange: () => {},
    vaccinatedFilter: false,
    castratedFilter: false,
    onVaccinatedChange: () => {},
    onCastratedChange: () => {},
    onRetry: () => {},
  }

  it('7 — active filter pill has bg-pop-solid class', () => {
    const { container } = renderWithProviders(<PetGrid {...defaultProps} />)
    const activePill = container.querySelector('.bg-pop-solid')
    expect(activePill).not.toBeNull()
    expect(activePill!.textContent).toBeTruthy()
  })

  // The pressed state is announced from the same condition that picks the fill.
  // Asserting both together is what stops them silently drifting apart.
  it('7b — the active pill announces aria-pressed, inactive pills do not', () => {
    const { container } = renderWithProviders(<PetGrid {...defaultProps} />)
    expect(container.querySelector('.bg-pop-solid')).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('button.bg-background')).toHaveAttribute('aria-pressed', 'false')
  })

  it('8 — inactive filter pills have bg-background class', () => {
    const { container } = renderWithProviders(<PetGrid {...defaultProps} />)
    const inactivePills = container.querySelectorAll('button.bg-background')
    expect(inactivePills.length).toBeGreaterThanOrEqual(5)
  })
})
