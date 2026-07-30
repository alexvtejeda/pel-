import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'

const mockUser = {
  id: 'u1',
  email: 'refugio@example.com',
  role: 'rescue_center' as const,
  auth_provider: 'email',
  preferred_lang: 'es',
  // Deliberately different from the centre's name below — the two fields are
  // separate saves, and the tests must not pass by accident.
  display_name: 'Refugio Central',
  avatar_url: null,
}
const updateSession = vi.fn()

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false, logout: vi.fn(), updateSession }),
}))
vi.mock('@/lib/api/auth', () => ({ uploadAvatar: vi.fn() }))
vi.mock('@/lib/api/rescue-centers', () => ({
  getMyRescueCenter: vi.fn(),
  updateRescueCenter: vi.fn(),
  uploadRcLogo: vi.fn(),
}))
vi.mock('@/lib/api/client', () => ({ apiClient: vi.fn() }))
// Spread the real module: the MFA components imported by this tab reach for
// more of it than the tab itself calls.
vi.mock('@/lib/api/mfa', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/mfa')>()),
  getMethods: vi.fn(),
}))

import { renderWithProviders } from '../test-utils'
import { SettingsTab } from '@/components/dashboard/rescue-center/settings-tab'
import { uploadAvatar } from '@/lib/api/auth'
import { getMyRescueCenter, updateRescueCenter } from '@/lib/api/rescue-centers'
import { apiClient } from '@/lib/api/client'
import { getMethods } from '@/lib/api/mfa'

const mockUpload = vi.mocked(uploadAvatar)
const mockGetRc = vi.mocked(getMyRescueCenter)
const mockUpdateRc = vi.mocked(updateRescueCenter)
const mockApi = vi.mocked(apiClient)
const mockMethods = vi.mocked(getMethods)

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom implements neither.
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
  mockGetRc.mockResolvedValue({
    data: {
      id: 'rc1',
      user_id: 'u1',
      name: 'Adóptame RD',
      phone: '809-555-0000',
      address: 'Calle 1',
      city: 'Santo Domingo',
      status: 'active',
      logo_url: null,
    },
    error: null,
  })
  mockMethods.mockResolvedValue({
    data: { mfa_enabled: false, methods: [], recovery_codes_remaining: 0 },
    error: null,
  })
  mockApi.mockResolvedValue({ ok: true, json: async () => ({}) } as never)
  mockUpdateRc.mockResolvedValue({ data: null, error: null })
  mockUpload.mockResolvedValue({ data: { avatar_url: 'https://cdn.test/a.jpg' }, error: null })
})

/** The avatar input is the first file input in the tab; the second is LogoUpload's. */
function avatarInput(container: HTMLElement) {
  return container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
}

const file = () => new File(['x'], 'foto.png', { type: 'image/png' })

describe('RC settings — profile photo', () => {
  it('uploads the chosen file instead of only previewing it', async () => {
    const { container } = renderWithProviders(<SettingsTab />)

    fireEvent.change(avatarInput(container), { target: { files: [file()] } })

    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1))
    expect(mockUpload.mock.calls[0][0]).toBeInstanceOf(File)
  })

  // The avatar is the centre's public face across the whole app — the session
  // has to learn about it without a reload, and without losing its other fields.
  it('folds the new URL into the session without clobbering it', async () => {
    const { container } = renderWithProviders(<SettingsTab />)

    fireEvent.change(avatarInput(container), { target: { files: [file()] } })

    await waitFor(() => expect(updateSession).toHaveBeenCalledTimes(1))
    expect(updateSession).toHaveBeenCalledWith({
      ...mockUser,
      avatar_url: 'https://cdn.test/a.jpg',
    })
  })

  it('surfaces an upload failure instead of pretending it worked', async () => {
    mockUpload.mockResolvedValue({ data: null, error: 'Archivo demasiado grande' })
    const { container } = renderWithProviders(<SettingsTab />)

    fireEvent.change(avatarInput(container), { target: { files: [file()] } })

    expect(await screen.findByText('Archivo demasiado grande')).toBeInTheDocument()
    expect(updateSession).not.toHaveBeenCalled()
  })
})

describe('RC settings — display name', () => {
  it('starts from the display name, not the email', () => {
    renderWithProviders(<SettingsTab />)

    expect(screen.getByPlaceholderText('Tu nombre')).toHaveValue('Refugio Central')
  })

  it('PATCHes the profile when saved', async () => {
    renderWithProviders(<SettingsTab />)

    fireEvent.change(screen.getByPlaceholderText('Tu nombre'), {
      target: { value: 'Refugio Luna' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0])

    await waitFor(() => expect(mockApi).toHaveBeenCalled())
    const [path, init] = mockApi.mock.calls[0]
    expect(path).toBe('/api/v1/auth/profile')
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(init!.body as string)).toEqual({ display_name: 'Refugio Luna' })
    await waitFor(() =>
      expect(updateSession).toHaveBeenCalledWith({ ...mockUser, display_name: 'Refugio Luna' }),
    )
  })

  it('reports a failed save instead of showing "Guardado"', async () => {
    mockApi.mockResolvedValue({ ok: false, json: async () => ({}) } as never)
    renderWithProviders(<SettingsTab />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0])

    expect(await screen.findByText('No se pudo guardar el nombre. Intenta de nuevo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardado' })).toBeNull()
  })
})

describe('RC settings — centre name', () => {
  it('loads the current centre name into the field', async () => {
    renderWithProviders(<SettingsTab />)

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Ej. Rescate Animal Santo Domingo')).toHaveValue('Adóptame RD'),
    )
  })

  it('PATCHes the rescue centre when saved', async () => {
    renderWithProviders(<SettingsTab />)

    const field = screen.getByPlaceholderText('Ej. Rescate Animal Santo Domingo')
    await waitFor(() => expect(field).toHaveValue('Adóptame RD'))

    fireEvent.change(field, { target: { value: 'Refugio Luna' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[1])

    await waitFor(() => expect(mockUpdateRc).toHaveBeenCalledWith('rc1', { name: 'Refugio Luna' }))
  })

  it('surfaces the API error instead of showing "Guardado"', async () => {
    mockUpdateRc.mockResolvedValue({ data: null, error: 'Nombre ya en uso' })
    renderWithProviders(<SettingsTab />)

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Ej. Rescate Animal Santo Domingo')).toHaveValue('Adóptame RD'),
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[1])

    expect(await screen.findByText('Nombre ya en uso')).toBeInTheDocument()
  })
})
