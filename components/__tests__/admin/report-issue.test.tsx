import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { ReportIssueButton } from '@/components/dashboard/admin/report-issue-button'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/admin', () => ({
  createIssue: vi.fn(),
}))

import { toast } from 'sonner'
import { createIssue } from '@/lib/api/admin'
const mockCreateIssue = vi.mocked(createIssue)

function renderComp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ReportIssueButton />
    </I18nextProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReportIssueButton', () => {
  it('opens the dialog when the FAB is clicked', () => {
    renderComp()
    expect(screen.queryByTestId('report-issue-submit')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument()
  })

  it('disables submit until title and repo are set', () => {
    renderComp()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    const submit = screen.getByTestId('report-issue-submit')
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    expect(submit).toBeDisabled()
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'frontend' } })
    expect(submit).toBeEnabled()
  })

  it('submits with mapped labels and shows a success toast on 201', async () => {
    mockCreateIssue.mockResolvedValue({
      data: { number: 42, url: 'https://github.com/org/pelu/issues/42' },
      error: null,
      status: 201,
    })
    renderComp()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'frontend' } })
    fireEvent.click(screen.getByTestId('report-issue-type-bug'))
    fireEvent.click(screen.getByTestId('report-issue-submit'))

    await waitFor(() =>
      expect(mockCreateIssue).toHaveBeenCalledWith({
        repo: 'frontend',
        title: 'Bug X',
        body: '',
        labels: ['bug', 'frontend'],
      })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByTestId('report-issue-submit')).not.toBeInTheDocument())
  })

  it('keeps the dialog open and shows an error toast on 403', async () => {
    mockCreateIssue.mockResolvedValue({ data: null, error: 'forbidden', status: 403 })
    renderComp()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'backend' } })
    fireEvent.click(screen.getByTestId('report-issue-submit'))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument()
  })
})
