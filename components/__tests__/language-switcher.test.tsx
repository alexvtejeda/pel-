import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'
import { getI18n } from '@/lib/i18n'
import { STORAGE_KEY } from '@/lib/i18n/language'

/*
  This file owns its `next/navigation` mock rather than importing test-utils.
  test-utils registers its own and wins the hoist race, and its properties are
  not re-definable — `vi.spyOn(nav, 'useParams')` throws "Cannot redefine
  property". Driving the locale through hoisted state is what actually works.
*/
const { mockReplace, route } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  route: { lang: 'es', pathname: '/es/pets' },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(), replace: mockReplace, back: vi.fn(), prefetch: vi.fn(),
  }),
  usePathname: () => route.pathname,
  useParams: () => ({ lang: route.lang }),
  useSearchParams: () => new URLSearchParams(),
}))

const renderSwitcher = () =>
  render(
    <I18nextProvider i18n={getI18n('es')}>
      <LanguageSwitcher />
    </I18nextProvider>
  )

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    window.localStorage.clear()
    route.lang = 'es'
    route.pathname = '/es/pets'
  })

  it('marks the current language with aria-current', () => {
    renderSwitcher()
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'EN' })).not.toHaveAttribute('aria-current')
  })

  // The switcher reads the locale from the URL, not from a mutable i18n global —
  // which is what makes the server and the client agree at hydration time.
  it('takes the current language from the route, not from internal state', () => {
    route.lang = 'en'
    route.pathname = '/en/pets'
    renderSwitcher()
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'ES' })).not.toHaveAttribute('aria-current')
  })

  // WCAG 2.5.3 (Label in Name): a voice-control user says "click EN", so the
  // accessible name has to be the visible text, not a translated replacement.
  // The full language name rides along as the description instead.
  it('names each button by its visible text and describes it in full', () => {
    renderSwitcher()
    expect(screen.getByRole('button', { name: 'ES' })).toHaveAttribute('title', 'Español')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('title', 'Inglés')
  })

  it('navigates to the same page under the chosen locale and persists the choice', () => {
    renderSwitcher()

    fireEvent.click(screen.getByRole('button', { name: 'EN' }))

    expect(mockReplace).toHaveBeenCalledWith('/en/pets')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en')
  })

  // Still persisted: the unprefixed entry stubs read this to decide where to
  // send a bare URL, so re-picking the current language is not a no-op.
  it('persists without navigating when the chosen locale is already active', () => {
    renderSwitcher()

    fireEvent.click(screen.getByRole('button', { name: 'ES' }))

    expect(mockReplace).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('es')
  })

  it('labels the group for assistive tech', () => {
    renderSwitcher()
    expect(screen.getByRole('group', { name: 'Cambiar idioma' })).toBeInTheDocument()
  })
})
