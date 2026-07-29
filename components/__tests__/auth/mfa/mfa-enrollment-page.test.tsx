import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import * as nav from 'next/navigation'

/*
  renderWithProviders() registers its own next/navigation mock and that
  registration beats a vi.mock declared here, so useSearchParams is controlled
  by spying on the already-mocked module rather than re-mocking it.
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

vi.mock('@/lib/auth/post-login-redirect', () => ({
  postLoginRedirect: vi.fn(),
}))

import MfaEnrollmentPage from '@/app/auth/mfa/enrollment/page'

const SKIP = 'Omitir por ahora'
const rescueCenter = { id: 'u2', role: 'rescue_center' }
const member = { id: 'u1', role: 'member' }

function setAuth(state: Partial<typeof authState>) {
  Object.assign(authState, { user: null, loading: false, mfaSetupRequired: false }, state)
}

function setSearch(search: string) {
  vi.spyOn(nav, 'useSearchParams').mockReturnValue(
    new URLSearchParams(search) as unknown as ReturnType<typeof nav.useSearchParams>
  )
}

const skipButton = () => screen.queryByRole('button', { name: SKIP })

beforeEach(() => {
  vi.clearAllMocks()
  setAuth({})
  setSearch('')
})

describe('/auth/mfa/enrollment page — when the skip button is offered', () => {
  it('hides skip for a forced user who arrived without ?mfa=1', () => {
    /*
      The account-sheet link (components/pets/pets-header.tsx) points at the
      bare route for every signed-in user, so a rescue_center with MFA pending
      lands here with no param. Reading only the param offered them a skip that
      vanished the instant they used it: handleSkip -> postLoginRedirect sees
      mfa_setup_required and bounces straight back with ?mfa=1.
    */
    setAuth({ user: rescueCenter, mfaSetupRequired: true })

    renderWithProviders(<MfaEnrollmentPage />)

    // The enrollment UI itself must still be there — hiding skip, not the page.
    expect(screen.getByRole('button', { name: /Passkey/ })).toBeInTheDocument()
    expect(skipButton()).not.toBeInTheDocument()
  })

  it('hides skip when postLoginRedirect sent the user here with ?mfa=1', () => {
    // The param path has to keep working on its own: right after login the
    // context flag is still false (AuthProvider only sets it in its init).
    setAuth({ user: rescueCenter, mfaSetupRequired: false })
    setSearch('mfa=1')

    renderWithProviders(<MfaEnrollmentPage />)

    expect(skipButton()).not.toBeInTheDocument()
  })

  it('offers skip on a voluntary visit with nothing pending', () => {
    setAuth({ user: member, mfaSetupRequired: false })

    renderWithProviders(<MfaEnrollmentPage />)

    expect(skipButton()).toBeInTheDocument()
  })
})
