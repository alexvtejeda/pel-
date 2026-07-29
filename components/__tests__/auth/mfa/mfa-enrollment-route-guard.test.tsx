import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import * as nav from 'next/navigation'

/*
  renderWithProviders() registers its own next/navigation mock, and that
  registration WINS over a vi.mock declared here (the helper's runs when it is
  imported — after this file's hoisted mocks). Its useRouter() also returns a
  fresh vi.fn() per call, so the redirect it records is invisible to a test.
  Spying on the already-mocked module is the way to work with the helper rather
  than around it: the spy replaces the helper's export for this file only.
*/
const { authState } = vi.hoisted(() => ({
  authState: {
    user: null as { id: string; role: string } | null,
    loading: false,
    mfaSetupRequired: false,
  },
}))

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => authState,
}))

/*
  ProtectedRoute renders its OWN <MfaEnrollment> when MFA setup is pending.
  Stubbing the module with a marker is what makes the two copies tellable
  apart: "guard-enrollment" is the guard's, the sentinel child below stands in
  for the route's own page (which passes different onComplete/onSkip props).
*/
vi.mock('@/components/auth/mfa/mfa-enrollment', () => ({
  MfaEnrollment: () => <div data-testid="guard-enrollment" />,
}))

import MfaEnrollmentLayout from '@/app/auth/mfa/enrollment/layout'
import { ProtectedRoute } from '@/components/auth/protected-route'

const PAGE = <div data-testid="enrollment-page">enrollment page</div>

let mockPush: ReturnType<typeof vi.fn>

function setAuth(state: Partial<typeof authState>) {
  Object.assign(authState, { user: null, loading: false, mfaSetupRequired: false }, state)
}

const member = { id: 'u1', role: 'member' }
const rescueCenter = { id: 'u2', role: 'rescue_center' }

beforeEach(() => {
  vi.clearAllMocks()
  mockPush = vi.fn()
  vi.spyOn(nav, 'useRouter').mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof nav.useRouter>)
  setAuth({})
})

describe('/auth/mfa/enrollment route guard', () => {
  it('redirects an anonymous visitor to /auth/login instead of rendering the enrollment UI', () => {
    setAuth({ user: null })

    renderWithProviders(<MfaEnrollmentLayout>{PAGE}</MfaEnrollmentLayout>)

    // The bug: with no guard the whole enrollment UI rendered for logged-out
    // visitors and every method fired a 401.
    expect(screen.queryByTestId('enrollment-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('guard-enrollment')).not.toBeInTheDocument()
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('shows the loader and decides nothing while the session is still resolving', () => {
    setAuth({ user: null, loading: true })

    renderWithProviders(<MfaEnrollmentLayout>{PAGE}</MfaEnrollmentLayout>)

    // PeluLoadingLogo is role="status". A redirect fired during `loading`
    // would bounce authenticated users out of their own enrollment route.
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('enrollment-page')).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('renders the route for any authenticated role — no requireRole on this one', () => {
    setAuth({ user: member })

    renderWithProviders(<MfaEnrollmentLayout>{PAGE}</MfaEnrollmentLayout>)

    expect(screen.getByTestId('enrollment-page')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("lets a rescue_center with MFA setup pending reach the route's own enrollment UI", () => {
    setAuth({ user: rescueCenter, mfaSetupRequired: true })

    renderWithProviders(<MfaEnrollmentLayout>{PAGE}</MfaEnrollmentLayout>)

    /*
      This is the whole reason the guard needs isMfaEnrollmentSurface. These
      users are the ones postLoginRedirect sends here (?mfa=1), and they are
      exactly the ones ProtectedRoute's mfaSetupRequired branch swallows:
      without it the guard renders its own <MfaEnrollment> — no skip button,
      and an onComplete that logs the user out — in place of the page that owns
      this route.
    */
    expect(screen.getByTestId('enrollment-page')).toBeInTheDocument()
    expect(screen.queryByTestId('guard-enrollment')).not.toBeInTheDocument()
    // Reaching the enrollment screen must never bounce — that would be a loop.
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('ProtectedRoute default (every other protected route)', () => {
  it('still intercepts a rescue_center with MFA setup pending', () => {
    setAuth({ user: rescueCenter, mfaSetupRequired: true })

    renderWithProviders(<ProtectedRoute requireRole={['rescue_center']}>{PAGE}</ProtectedRoute>)

    // isMfaEnrollmentSurface is opt-in: forced enrollment fires everywhere else.
    expect(screen.getByTestId('guard-enrollment')).toBeInTheDocument()
    expect(screen.queryByTestId('enrollment-page')).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
