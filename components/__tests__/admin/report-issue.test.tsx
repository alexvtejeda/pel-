import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ReportIssueButton } from '@/components/dashboard/admin/report-issue-button'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/admin', () => ({
  createIssue: vi.fn(),
}))

import { toast } from 'sonner'
import { createIssue } from '@/lib/api/admin'
const mockCreateIssue = vi.mocked(createIssue)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReportIssueButton', () => {
  it('opens the dialog when the FAB is clicked', () => {
    renderWithProviders(<ReportIssueButton />)
    expect(screen.queryByTestId('report-issue-submit')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument()
  })

  it('disables submit until title and repo are set', () => {
    renderWithProviders(<ReportIssueButton />)
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
    renderWithProviders(<ReportIssueButton />)
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
    renderWithProviders(<ReportIssueButton />)
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'backend' } })
    fireEvent.click(screen.getByTestId('report-issue-submit'))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument()
  })

  it('shows a localized error toast (not the raw server message) on a generic failure', async () => {
    mockCreateIssue.mockResolvedValue({ data: null, error: 'boom', status: 500 })
    renderWithProviders(<ReportIssueButton />)
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'frontend' } })
    fireEvent.click(screen.getByTestId('report-issue-submit'))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // i18n requirement: the raw server error ('boom') must never be shown
    expect(toast.error).not.toHaveBeenCalledWith('boom')
    // dialog stays open on failure
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument()
  })
})
