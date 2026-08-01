import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/client', () => ({ apiClient: vi.fn() }))
vi.mock('@/lib/api/user-pets', () => ({ createUserPets: vi.fn() }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'member' }, updateSession: vi.fn() }),
}))
// Canvas-based decoration; jsdom has no WebGL and the wizard does not need it.
vi.mock('@/components/ui/beams', () => ({ BackgroundBeams: () => null }))

import { MemberWizard } from '@/components/auth/onboarding/member-wizard'
import { apiClient } from '@/lib/api/client'

const profileBody = () => {
  const call = vi.mocked(apiClient).mock.calls.find(([path]) => path === '/api/v1/auth/profile')
  return call ? JSON.parse(call[1]!.body as string) : undefined
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(apiClient).mockResolvedValue({
    ok: true,
    json: async () => ({ user: { id: 'u1' } }),
  } as never)
})

/*
  The phone is captured here because the publish modal used to be the only
  screen that could set one — a member who never listed a pet had no way to
  provide a contact number, and one who did had to discover it mid-publish.
*/
describe('MemberWizard — contact phone', () => {
  it('offers a phone field on the first step', () => {
    renderWithProviders(<MemberWizard />)

    expect(screen.getByLabelText('Teléfono (opcional)')).toBeInTheDocument()
  })

  // Optional means optional: the step gate is the name, nothing else.
  it('does not block the step when the phone is left empty', () => {
    renderWithProviders(<MemberWizard />)

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('¿Cómo te llamamos?'), { target: { value: 'María' } })

    expect(screen.getByRole('button', { name: 'Siguiente' })).not.toBeDisabled()
  })

  it('saves the phone alongside the display name', async () => {
    renderWithProviders(<MemberWizard />)

    fireEvent.change(screen.getByLabelText('¿Cómo te llamamos?'), { target: { value: 'María' } })
    fireEvent.change(screen.getByLabelText('Teléfono (opcional)'), {
      target: { value: '809-555-0123' },
    })
    next()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    next()
    fireEvent.click(screen.getByRole('button', { name: 'Solo estoy explorando' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar' }))

    await waitFor(() =>
      expect(profileBody()).toEqual({ display_name: 'María', phone: '809-555-0123' })
    )
  })

  /*
    An omitted key leaves the column alone; an empty string would overwrite a
    number the member may already have set elsewhere with "".
  */
  it('omits the phone key entirely when the field is blank', async () => {
    renderWithProviders(<MemberWizard />)

    fireEvent.change(screen.getByLabelText('¿Cómo te llamamos?'), { target: { value: 'María' } })
    next()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    next()
    fireEvent.click(screen.getByRole('button', { name: 'Solo estoy explorando' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completar' }))

    await waitFor(() => expect(profileBody()).toEqual({ display_name: 'María' }))
  })
})
