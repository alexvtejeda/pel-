import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

/*
  This file deliberately does NOT use renderWithProviders() from ../test-utils.
  That helper mocks next/navigation itself, and its registration WINS over a
  mock declared in the test file (verified empirically: an override here never
  receives the call, because the helper registers when it is imported — after
  this file's hoisted vi.mock). Its useRouter() also hands back a fresh vi.fn()
  per call, so the redirect it records is unreachable from a test.

  The 404 branch is the behaviour this fix must not regress, so router.replace
  has to be inspectable. This file owns the router mock and wraps in the i18n
  provider directly.

  Bypassing the helper also drops its next/image mock, which is only harmless
  because the PET fixture has photos: [] and so never renders <Image>. Give a
  fixture a photo and you have to mock next/image here too.
*/

/*
  The router object is hoisted as ONE stable instance rather than rebuilt per
  useRouter() call, because the real Next router is referentially stable. A
  fresh object per call changes the identity of the page's `load` callback on
  every render, so its effect re-fires, `loading` flips back to true and the
  whole form is unmounted and remounted mid-test — which silently discards an
  attached file and a submitted state. Measured: 2 loads with an unstable mock,
  1 with this one.
*/
const { mockReplace, mockRouter } = vi.hoisted(() => {
  const mockReplace = vi.fn()
  return {
    mockReplace,
    mockRouter: { push: vi.fn(), replace: mockReplace, back: vi.fn(), prefetch: vi.fn() },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/api/pets-public', () => ({
  getPublicPet: vi.fn(),
  getPetForm: vi.fn(),
}))
vi.mock('@/lib/api/submissions', () => ({
  submitAdoptionForm: vi.fn(),
  uploadSubmissionFile: vi.fn(),
}))
/*
  Same reasoning as mockRouter: the real `user` is React state inside
  AuthProvider, so it keeps its identity across re-renders. Minting a new object
  per useAuth() call puts a fresh value in the loader effect's dep array, so any
  unrelated re-render (e.g. the page setting fileWarning) re-runs the load,
  flips `loading` back to true and remounts the form from scratch.
*/
const { mockUser } = vi.hoisted(() => ({
  mockUser: { id: 'u1', email: 'a@b.com', role: 'member' },
}))

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))

import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'
import { RouteTransitionProvider } from '@/components/transitions/route-transition-context'
import { getPublicPet, getPetForm } from '@/lib/api/pets-public'
import { submitAdoptionForm, uploadSubmissionFile } from '@/lib/api/submissions'

const mockGetPet = vi.mocked(getPublicPet)
const mockGetForm = vi.mocked(getPetForm)
const mockSubmit = vi.mocked(submitAdoptionForm)
const mockUpload = vi.mocked(uploadSubmissionFile)

const PET = { id: 'p1', name: 'Luna', age: 24, photos: [], conditions: [] } as never
const FORM = {
  form: { id: 'f1', name: 'Solicitud', fields: [] },
  rc: { id: 'rc1', name: 'Rescate RD', logo_url: null, city: 'Santo Domingo' },
  advisory: false,
} as never

const CONN_ERROR = 'Error de conexión'

/*
  Both requests failing is the easy case. A ONE-SIDED failure is what makes the
  loader's check an OR rather than an AND: with `&&`, the healthy leg masks the
  broken one, the load falls through to the !data branch and redirects to /pets —
  the exact bug this suite exists to pin. Both directions are covered because
  either request can be the one that dies.
*/
const ONE_SIDED: [
  string,
  Awaited<ReturnType<typeof getPublicPet>>,
  Awaited<ReturnType<typeof getPetForm>>,
][] = [
  ['the pet request', { data: null, error: CONN_ERROR }, { data: FORM, error: null }],
  ['the form request', { data: PET, error: null }, { data: null, error: CONN_ERROR }],
]

/*
  RouteTransitionProvider is here because the success screen's "Volver a mascotas"
  is a TransitionLink, and useRouteTransition() throws outside the provider. The
  root layout wraps every route in it, so this mirrors production rather than
  papering over a missing provider. It reads useRouter/usePathname, both already
  mocked above.
*/
const renderPage = () =>
  render(<AdoptPetPage petId="p1" />, {
    wrapper: ({ children }) => (
      <I18nextProvider i18n={i18n}>
        <RouteTransitionProvider>{children}</RouteTransitionProvider>
      </I18nextProvider>
    ),
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdoptPetPage load states', () => {
  it('shows an error with retry when the request fails', async () => {
    mockGetPet.mockResolvedValue({ data: null, error: 'Error de conexión' })
    mockGetForm.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderPage()

    // Asserting the copy, not just the role: a missing pets:adopt.load_error key
    // would render the raw key to the user and still satisfy role="alert".
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar esta solicitud'
    )
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // The whole point of the fix: an outage must not bounce the user to /pets.
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it.each(ONE_SIDED)(
    'shows the error state when only %s fails',
    async (_leg, petRes, formRes) => {
      mockGetPet.mockResolvedValue(petRes)
      mockGetForm.mockResolvedValue(formRes)

      renderPage()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos cargar esta solicitud'
      )
      expect(mockReplace).not.toHaveBeenCalled()
    }
  )

  it('retries the fetch when retry is pressed', async () => {
    mockGetPet.mockResolvedValue({ data: null, error: 'Error de conexión' })
    mockGetForm.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderPage()
    await screen.findByRole('button', { name: 'Reintentar' })

    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Luna')).toBeInTheDocument()
  })

  it('renders the form when both requests succeed', async () => {
    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM, error: null })

    renderPage()

    expect(await screen.findByText('Solicitud')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('still redirects to /pets when the pet genuinely does not exist', async () => {
    // pets-public maps a 404 to { data: null, error: null } — the one case that
    // really does mean "no such pet".
    mockGetPet.mockResolvedValue({ data: null, error: null })
    mockGetForm.mockResolvedValue({ data: null, error: null })

    renderPage()

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/pets'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

const FORM_WITH_FILE = {
  form: {
    id: 'f1',
    name: 'Solicitud',
    fields: [
      { id: 'q1', type: 'file_upload', label: 'Cédula', required: false, options: [], section: '' },
    ],
  },
  rc: { id: 'rc1', name: 'Rescate RD', logo_url: null, city: 'Santo Domingo' },
  advisory: false,
} as never

/*
  handleSubmit iterates the file map, so with nothing attached uploadSubmissionFile
  is never called at all (measured: 0 calls) and every assertion about a failed
  upload passes vacuously. The upload leg only exists once a file is really on the
  field. The input is hidden — the dropzone div proxies clicks to it — so its id is
  the only handle; there is no accessible query for it.
*/
const attachFile = (fieldId: string) => {
  const input = document.getElementById(`file-input-${fieldId}`) as HTMLInputElement | null
  if (!input) throw new Error(`no file input rendered for field ${fieldId}`)
  fireEvent.change(input, {
    target: { files: [new File(['x'], 'cedula.pdf', { type: 'application/pdf' })] },
  })
}

describe('AdoptPetPage submit outcomes', () => {
  it('shows success with a file warning when only the upload fails', async () => {
    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM_WITH_FILE, error: null })
    mockSubmit.mockResolvedValue({ data: { submission_id: 's1' }, error: null } as never)
    mockUpload.mockResolvedValue({ data: null, error: 'boom' } as never)

    renderPage()
    const submit = await screen.findByRole('button', { name: /Enviar solicitud/ })
    attachFile('q1')
    fireEvent.click(submit)

    expect(await screen.findByText('¡Solicitud enviada!')).toBeInTheDocument()
    expect(
      screen.getByText(/no se pudo subir/i)
    ).toBeInTheDocument()
    // The regression: setError(fileErr) used to render the raw API error string
    // in the page-level destructive banner, right above the success screen.
    expect(screen.queryByText('boom')).not.toBeInTheDocument()
  })

  it('shows no warning when everything succeeds', async () => {
    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM_WITH_FILE, error: null })
    mockSubmit.mockResolvedValue({ data: { submission_id: 's1' }, error: null } as never)
    mockUpload.mockResolvedValue({ data: { ok: true }, error: null } as never)

    renderPage()
    const submit = await screen.findByRole('button', { name: /Enviar solicitud/ })
    attachFile('q1')
    fireEvent.click(submit)

    expect(await screen.findByText('¡Solicitud enviada!')).toBeInTheDocument()
    // Without this the "no warning" assertion below would also hold for a form
    // that never attempted an upload — the failure mode attachFile exists to stop.
    await waitFor(() => expect(mockUpload).toHaveBeenCalled())
    expect(screen.queryByText(/no se pudo subir/i)).not.toBeInTheDocument()
  })
})
