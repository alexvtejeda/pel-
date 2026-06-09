'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug } from '@fortawesome/free-solid-svg-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createIssue } from '@/lib/api/admin'

type Repo = '' | 'backend' | 'frontend'
type IssueType = '' | 'bug' | 'missing API endpoint' | 'docs' | 'chore'

const ISSUE_TYPES: { value: Exclude<IssueType, ''>; labelKey: string; testId: string }[] = [
  { value: 'bug', labelKey: 'admin.report_issue.type_bug', testId: 'bug' },
  { value: 'missing API endpoint', labelKey: 'admin.report_issue.type_missing_endpoint', testId: 'missing-endpoint' },
  { value: 'docs', labelKey: 'admin.report_issue.type_docs', testId: 'docs' },
  { value: 'chore', labelKey: 'admin.report_issue.type_chore', testId: 'chore' },
]

export function ReportIssueButton() {
  const { t } = useTranslation('pets')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [repo, setRepo] = useState<Repo>('')
  const [type, setType] = useState<IssueType>('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim() !== '' && repo !== '' && !submitting

  const reset = () => {
    setTitle('')
    setBody('')
    setRepo('')
    setType('')
  }

  const handleClose = () => {
    reset()
    setOpen(false)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    // labels = chosen type (if any) + the repo label (auto-added for triage)
    const labels = [...(type ? [type] : []), repo as 'backend' | 'frontend']
    const { data, status } = await createIssue({
      repo: repo as 'backend' | 'frontend',
      title: title.trim(),
      body,
      labels,
    })
    setSubmitting(false)

    if (status === 201 && data) {
      toast.success(t('admin.report_issue.success', { number: data.number }), {
        action: {
          label: t('admin.report_issue.view_on_github'),
          onClick: () => window.open(data.url, '_blank', 'noopener,noreferrer'),
        },
      })
      reset()
      setOpen(false)
      return
    }
    if (status === 403) {
      toast.error(t('admin.report_issue.mfa_required'), {
        action: {
          label: t('admin.report_issue.login_again'),
          onClick: () => router.push('/auth/login'),
        },
      })
      return
    }
    toast.error(t('admin.report_issue.error'))
  }

  return (
    <>
      <button
        type="button"
        data-testid="report-issue-fab"
        aria-label={t('admin.report_issue.aria_label')}
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-20 md:bottom-6 z-50 w-14 h-14 rounded-full bg-pop-550 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <FontAwesomeIcon icon={faBug} className="text-xl" />
      </button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.report_issue.title')}</DialogTitle>
            <DialogDescription>{t('admin.report_issue.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-title" className="text-sm font-medium">
                {t('admin.report_issue.field_title')}
              </label>
              <Input
                id="issue-title"
                data-testid="report-issue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('admin.report_issue.field_title_placeholder')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-repo" className="text-sm font-medium">
                {t('admin.report_issue.field_repo')}
              </label>
              <select
                id="issue-repo"
                data-testid="report-issue-repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value as Repo)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  {t('admin.report_issue.repo_placeholder')}
                </option>
                <option value="backend">{t('admin.report_issue.repo_backend')}</option>
                <option value="frontend">{t('admin.report_issue.repo_frontend')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t('admin.report_issue.field_type')}</span>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map((it) => (
                  <button
                    key={it.value}
                    type="button"
                    data-testid={`report-issue-type-${it.testId}`}
                    onClick={() => setType((prev) => (prev === it.value ? '' : it.value))}
                    className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                      type === it.value
                        ? 'bg-pop-550 text-white border-pop-550'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    {t(it.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-body" className="text-sm font-medium">
                {t('admin.report_issue.field_description')}
              </label>
              <textarea
                id="issue-body"
                data-testid="report-issue-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder={t('admin.report_issue.field_description_placeholder')}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={handleClose}>
              {t('admin.report_issue.cancel')}
            </Button>
            <Button
              data-testid="report-issue-submit"
              className="rounded-xl"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? t('admin.report_issue.submitting') : t('admin.report_issue.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
