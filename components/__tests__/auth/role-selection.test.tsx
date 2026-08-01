import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

// Rendered without `renderWithProviders` on purpose: that helper registers its
// own next/navigation mock with a throwaway `push`, which would shadow this one
// and make every redirect assertion below silently vacuous.
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/auth/role-selection',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props
    return <img {...rest} />
  },
}))

const setRole = vi.fn()
let currentUser: Record<string, unknown> | null = null
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: currentUser, setRole }),
}))

vi.mock('@/lib/api/rescue-centers', () => ({ getMyRescueCenter: vi.fn() }))
vi.mock('@/lib/api/businesses', () => ({ getMyBusiness: vi.fn() }))
// Canvas decoration; jsdom has no WebGL and the picker does not need it.
vi.mock('@/components/ui/beams', () => ({ BackgroundBeams: () => null }))

import { RoleSelection } from '@/components/auth/role-selection'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import { getMyBusiness } from '@/lib/api/businesses'

// handleSubmit leaves via a document load rather than router.push, so the
// destination is only observable on window.location. jsdom's own location
// cannot be assigned to, so swap in a plain object for the assertion.
const originalLocation = window.location
let location: { href: string }

const renderPicker = () =>
  render(<RoleSelection />, {
    wrapper: ({ children }) => <I18nextProvider i18n={i18n}>{children}</I18nextProvider>,
  })

const pick = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }))
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  currentUser = null
  location = { href: '' }
  Object.defineProperty(window, 'location', { value: location, writable: true, configurable: true })
  setRole.mockResolvedValue({ error: null })
  vi.mocked(getMyRescueCenter).mockResolvedValue({ data: null, error: null })
  vi.mocked(getMyBusiness).mockResolvedValue({ data: null, error: null })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
})

/*
  The picker doubles as the "change role" surface reached from the profile
  sheet, so it can no longer bounce everyone who already holds a role — but it
  must still bounce the ones who merely landed on the URL.
*/
describe('RoleSelection — who gets redirected away', () => {
  it('sends a user who already has a role back to their home', async () => {
    currentUser = { id: 'u1', role: 'rescue_center', display_name: 'Refugio' }

    renderPicker()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/rescue-center'))
  })

  // The flag is set by the "Cambiar rol" button and the wizards' breadcrumb.
  // The existing center is what makes this a regression test: the picker used
  // to redirect on completed onboarding regardless of the flag, so the button
  // in the profile sheet bounced straight back out.
  it('keeps a deliberate visitor on the picker even with onboarding complete', async () => {
    currentUser = { id: 'u1', role: 'rescue_center', display_name: 'Refugio' }
    sessionStorage.setItem('pelu_changing_role', '1')
    vi.mocked(getMyRescueCenter).mockResolvedValue({ data: { id: 'rc1' } as never, error: null })

    renderPicker()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument())
    expect(push).not.toHaveBeenCalled()
  })

  it('leaves a user with no role alone', async () => {
    currentUser = { id: 'u1', role: null, display_name: null }

    renderPicker()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument())
    expect(push).not.toHaveBeenCalled()
  })
})

/*
  Switching back to a role you already set up used to replay its wizard: only
  the rescue-center wizard self-redirects, the other two do not.
*/
describe('RoleSelection — where a pick lands', () => {
  it('skips the wizard when the picked role is already set up', async () => {
    currentUser = { id: 'u1', role: 'member', display_name: 'María' }
    sessionStorage.setItem('pelu_changing_role', '1')
    vi.mocked(getMyBusiness).mockResolvedValue({ data: { id: 'b1' } as never, error: null })

    renderPicker()
    pick(/Negocio/)
    submit()

    await waitFor(() => expect(location.href).toBe('/dashboard/business'))
    expect(setRole).toHaveBeenCalledWith('business')
  })

  it('runs the wizard when the picked role has no record yet', async () => {
    currentUser = { id: 'u1', role: 'member', display_name: 'María' }
    sessionStorage.setItem('pelu_changing_role', '1')

    renderPicker()
    pick(/Negocio/)
    submit()

    await waitFor(() => expect(location.href).toBe('/auth/onboarding/business'))
  })

  // A member is "set up" once they have a display name — there is no record to
  // fetch, so neither entity endpoint should be consulted.
  it('treats a named member as set up and sends them home', async () => {
    currentUser = { id: 'u1', role: 'business', display_name: 'María' }
    sessionStorage.setItem('pelu_changing_role', '1')

    renderPicker()
    pick(/Miembro/)
    submit()

    await waitFor(() => expect(location.href).toBe('/'))
    expect(getMyRescueCenter).not.toHaveBeenCalled()
    expect(getMyBusiness).not.toHaveBeenCalled()
  })

  it('clears the change-role flag once a pick is submitted', async () => {
    currentUser = { id: 'u1', role: 'member', display_name: 'María' }
    sessionStorage.setItem('pelu_changing_role', '1')

    renderPicker()
    pick(/Centro de rescate/)
    submit()

    await waitFor(() => expect(sessionStorage.getItem('pelu_changing_role')).toBeNull())
  })

  it('stays put and shows the error when the role update fails', async () => {
    currentUser = { id: 'u1', role: 'member', display_name: 'María' }
    sessionStorage.setItem('pelu_changing_role', '1')
    setRole.mockResolvedValue({ error: 'No se pudo actualizar' })

    renderPicker()
    pick(/Negocio/)
    submit()

    await waitFor(() => expect(screen.getByText('No se pudo actualizar')).toBeInTheDocument())
    expect(location.href).toBe('')
  })
})
