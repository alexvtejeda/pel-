import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { FormsTab } from '@/components/dashboard/rescue-center/forms-tab'

vi.mock('@/lib/api/rescue-centers', () => ({
  getMyRescueCenter: vi.fn(),
}))
vi.mock('@/lib/api/forms', () => ({
  listForms: vi.fn(),
  getForm: vi.fn(),
  createForm: vi.fn(),
  updateForm: vi.fn(),
}))
vi.mock('@/lib/api/submissions', () => ({
  listFormSubmissions: vi.fn(),
}))

// Child components not under test — stubbed so we render just the tab shell
vi.mock('@/components/forms/form-builder', () => ({
  FormBuilder: () => <div data-testid="form-builder" />,
}))
vi.mock('@/components/forms/form-renderer', () => ({
  FormRenderer: () => <div data-testid="form-renderer" />,
}))
vi.mock('@/components/dashboard/rescue-center/logo-upload', () => ({
  LogoUpload: () => <div data-testid="logo-upload" />,
}))

import { getMyRescueCenter } from '@/lib/api/rescue-centers'
import { listForms } from '@/lib/api/forms'
import { listFormSubmissions } from '@/lib/api/submissions'

const mockGetRc = vi.mocked(getMyRescueCenter)
const mockListForms = vi.mocked(listForms)
const mockListFormSubs = vi.mocked(listFormSubmissions)

const FORM = { id: 'form-1', name: 'Formulario estándar', is_special_needs: false, fields: [] }

const ROWS = [
  { id: 's1', pet_name: 'Firulais', member_email: 'juan@mail.com', status: 'pending' as const, submitted_at: '2026-07-24T10:00:00Z' },
  { id: 's2', pet_name: 'Michi', member_email: 'ana@mail.com', status: 'approved' as const, submitted_at: '2026-07-23T10:00:00Z' },
]

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error partial RC shape is enough for this component
  mockGetRc.mockResolvedValue({ data: { name: 'Refugio X', logo_url: null }, error: null })
  // @ts-expect-error partial Form shape is enough for this component
  mockListForms.mockResolvedValue({ data: [FORM], error: null })
})

async function openSubmissions() {
  renderWithProviders(<FormsTab />)
  const tab = await screen.findByRole('button', { name: 'Solicitudes' })
  fireEvent.click(tab)
}

describe('FormsTab — Solicitudes view', () => {
  it('renders a row per submission for the active form', async () => {
    mockListFormSubs.mockResolvedValue({ data: ROWS, error: null })

    await openSubmissions()

    expect(await screen.findByText('Firulais')).toBeInTheDocument()
    expect(screen.getByText('juan@mail.com')).toBeInTheDocument()
    expect(screen.getByText('Michi')).toBeInTheDocument()
    expect(screen.getByText('ana@mail.com')).toBeInTheDocument()
    // fetched for the active form, no status filter initially
    expect(mockListFormSubs).toHaveBeenCalledWith('form-1', undefined)
  })

  it('shows the empty state when there are no submissions', async () => {
    mockListFormSubs.mockResolvedValue({ data: [], error: null })

    await openSubmissions()

    expect(await screen.findByText('Este formulario aún no tiene solicitudes.')).toBeInTheDocument()
  })

  it('refetches with the selected status filter', async () => {
    mockListFormSubs.mockResolvedValue({ data: [], error: null })

    await openSubmissions()
    await screen.findByText('Este formulario aún no tiene solicitudes.')

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'approved' } })

    await waitFor(() =>
      expect(mockListFormSubs).toHaveBeenCalledWith('form-1', 'approved'),
    )
  })
})
