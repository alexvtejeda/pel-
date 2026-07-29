'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import { Form, FormField, FieldType } from '@/lib/api/forms'
import { TransitionLink } from '@/components/transitions/transition-link'
import { FileDropzone } from '@/components/ui/file-dropzone'

type Answers = Record<string, string | string[]>
type FileMap = Record<string, File>

interface FormRendererProps {
  form: Form
  rc: { name: string; logo_url: string | null }
  preview?: boolean
  onSubmit?: (answers: Answers, files: FileMap) => Promise<void>
  /**
   * Shown on the success screen when the submission itself succeeded but a
   * secondary step (e.g. a file upload) did not. Distinct from submitError,
   * which means the submission failed and there is no success to show.
   */
  submitWarning?: string | null
}

export function FormRenderer({ form, rc: _rc, preview = false, onSubmit, submitWarning }: FormRendererProps) {
  const { t } = useTranslation('pets')
  const [answers, setAnswers]     = useState<Answers>({})
  const [files, setFiles]         = useState<FileMap>({})
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // `preview` is a prop no call site currently passes; the real signal that we
  // are not the live adoption form is the absence of onSubmit. Both dashboard
  // form-builder previews render us without it. Keyed off this, not `preview`,
  // so the layout branches below are reachable instead of dead.
  const isPreview = preview || !onSubmit

  const setAnswer = (id: string, value: string | string[]) =>
    setAnswers(prev => ({ ...prev, [id]: value }))

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    for (const field of form.fields) {
      if (!field.required) continue
      const ans = answers[field.id]
      if (!ans || (Array.isArray(ans) ? ans.length === 0 : ans.trim() === '')) {
        newErrors[field.id] = t('forms.required_error')
      }
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      const firstId = Object.keys(newErrors)[0]
      document.getElementById(`field-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    // The `!onSubmit` half is redundant at runtime but narrows the type below.
    if (isPreview || !onSubmit) return
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(answers, files)
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('forms.submit_error'))
    } finally {
      setSubmitting(false)
    }
  }

  // Group consecutive fields by their section so each becomes one card. The
  // builder emits section as a plain string on each field, not as a container.
  const sections = useMemo(() => {
    const groups: { name: string; fields: FormField[] }[] = []
    for (const field of form.fields) {
      const name = field.section || ''
      const last = groups[groups.length - 1]
      if (last && last.name === name) last.fields.push(field)
      else groups.push({ name, fields: [field] })
    }
    return groups
  }, [form.fields])

  const requiredFields = useMemo(() => form.fields.filter(f => f.required), [form.fields])
  const answeredRequired = requiredFields.filter(f => {
    const answer = answers[f.id]
    return Array.isArray(answer) ? answer.length > 0 : typeof answer === 'string' && answer.trim() !== ''
  }).length
  const progressPct = requiredFields.length === 0
    ? 100
    : Math.round((answeredRequired / requiredFields.length) * 100)

  // Hooks must run on every render, so the success screen returns below them.
  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <FontAwesomeIcon icon={faPaw} className="text-4xl text-pop-550" />
        <h2 className="text-xl font-bold">{t('forms.success_title')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('forms.success_description')}
        </p>
        <div className="p-4 bg-muted rounded-2xl text-sm text-muted-foreground">
          {t('submission.pending', { ns: 'pets' })}: <span className="font-medium text-foreground">{t('forms.success_status')}</span>
        </div>
        {submitWarning && (
          <div role="alert" className="p-4 bg-warning-bg border border-warning/40 rounded-2xl text-sm text-warning-foreground text-left">
            {submitWarning}
          </div>
        )}
        <TransitionLink
          href="/pets"
          className="focus-ring inline-block px-6 py-2.5 bg-pop-solid text-white rounded-xl text-sm font-medium hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98]"
        >
          {t('forms.back_to_pets')}
        </TransitionLink>
      </div>
    )
  }

  return (
    // The /adopt page already supplies `max-w-2xl mx-auto px-4 py-8`, so the
    // live form only needs the vertical rhythm. The dashboard previews wrap us
    // in a bare bordered box with no padding of their own, hence the split.
    <div className={isPreview ? 'max-w-2xl mx-auto px-4 py-8 space-y-6' : 'space-y-6'}>
      <h1 className="text-2xl font-bold">{form.name}</h1>

      {!isPreview && requiredFields.length > 0 && (
        // top-40 matches the h-40 banner /adopt pins above this form.
        <div className="sticky top-40 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur">
          <div
            role="progressbar"
            aria-valuenow={answeredRequired}
            aria-valuemin={0}
            aria-valuemax={requiredFields.length}
            aria-label={t('forms.progress', { answered: answeredRequired, total: requiredFields.length })}
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-pop-solid transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('forms.progress', { answered: answeredRequired, total: requiredFields.length })}
          </p>
        </div>
      )}

      {sections.map((section, sectionIndex) => (
        <section
          key={`${section.name}-${sectionIndex}`}
          // A bare <section> is generic to screen readers; naming it by its own
          // heading promotes each card to a navigable region landmark.
          aria-labelledby={`form-section-${sectionIndex}`}
          className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 id={`form-section-${sectionIndex}`} className="text-base font-semibold">
            {section.name || t('forms.section_untitled')}
          </h2>
          {section.fields.map(field => (
            <FieldInput
              key={field.id}
              field={field}
              value={answers[field.id]}
              fileValue={files[field.id]}
              error={errors[field.id]}
              preview={preview}
              onChange={val => setAnswer(field.id, val)}
              onFile={file => setFiles(prev => ({ ...prev, [field.id]: file }))}
              allAnswers={answers}
              onAnswerChange={setAnswer}
            />
          ))}
        </section>
      ))}

      {!isPreview && (
        <div className="pt-4">
          {submitError && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm animate-wiggle">
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="focus-ring w-full py-3 bg-pop-solid text-white rounded-xl font-semibold transition-[background-color,transform] hover:bg-pop-850 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? t('forms.submitting') : t('forms.submit_button')}
          </button>
        </div>
      )}
    </div>
  )
}

interface FieldInputProps {
  field: FormField
  value: string | string[] | undefined
  fileValue: File | undefined
  error: string | undefined
  preview: boolean
  onChange: (val: string | string[]) => void
  onFile: (file: File) => void
  allAnswers: Answers
  onAnswerChange: (id: string, value: string | string[]) => void
}

function FieldInput({ field, value, fileValue, error, preview, onChange, onFile, allAnswers, onAnswerChange }: FieldInputProps) {
  const { t } = useTranslation('pets')
  const strVal    = typeof value === 'string' ? value : ''
  const arrVal    = Array.isArray(value) ? value : []
  const inputId   = `input-${field.id}`
  const errorId   = `error-${field.id}`
  const descId    = `desc-${field.id}`
  const describedBy = [field.description ? descId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined
  const inputCls  = `focus-ring w-full rounded-xl border px-4 py-3 text-sm outline-none bg-background ${error ? 'border-destructive' : 'border-input'}`

  // Which follow-up to show (for multiple_choice / dropdown)?
  const activeFollowUp = (field.type === 'multiple_choice' || field.type === 'dropdown')
    ? field.follow_ups?.find(fu => fu.when_answer === strVal)
    : null

  // Radio and checkbox sets get a group label instead of a for/id pair,
  // because there is no single control to point at.
  const isGroup = field.type === 'multiple_choice' || field.type === 'checkbox'
  // The rating scale is a row of buttons (named as its own group below), and
  // file_upload's real <input> lives inside the dropzone and is not rendered
  // at all in preview. Pointing htmlFor at an id that does not exist is worse
  // than omitting it, so those cases resolve to undefined.
  const labelFor =
    isGroup || field.type === 'rating'
      ? undefined
      : field.type === 'file_upload'
        ? (preview ? undefined : `file-input-${field.id}`)
        : inputId

  return (
    <div
      id={`field-${field.id}`}
      className="space-y-2"
      role={isGroup ? 'group' : undefined}
      aria-labelledby={isGroup ? `label-${field.id}` : undefined}
    >
      <label
        id={`label-${field.id}`}
        htmlFor={labelFor}
        className="block text-sm font-medium"
      >
        {field.label}
        {field.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
      </label>
      {field.description && (
        <p id={descId} className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {field.type === 'short_text' && (
        <input id={inputId} type="text" value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview} />
      )}
      {field.type === 'long_text' && (
        <textarea id={inputId} rows={4} value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview} />
      )}
      {field.type === 'date' && (
        <input id={inputId} type="date" value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview} />
      )}
      {field.type === 'multiple_choice' && (
        <div className="space-y-1">
          {field.options.map(opt => (
            <label
              key={opt}
              className="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pop-700 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors hover:bg-muted/60"
            >
              <input type="radio" name={field.id} value={opt}
                checked={strVal === opt} onChange={() => onChange(opt)}
                aria-describedby={describedBy}
                className="accent-primary" disabled={preview} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkbox' && (
        <div className="space-y-1">
          {field.options.map(opt => (
            <label
              key={opt}
              className="focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pop-700 flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors hover:bg-muted/60"
            >
              <input type="checkbox" value={opt}
                checked={arrVal.includes(opt)}
                onChange={e => {
                  if (e.target.checked) onChange([...arrVal, opt])
                  else onChange(arrVal.filter(v => v !== opt))
                }}
                aria-describedby={describedBy}
                className="accent-primary" disabled={preview} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'dropdown' && (
        <select id={inputId} value={strVal} onChange={e => onChange(e.target.value)}
          required={field.required} aria-invalid={!!error} aria-describedby={describedBy}
          className={inputCls} disabled={preview}>
          <option value="">{t('forms.select_placeholder')}</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
      {field.type === 'rating' && (
        <div className="flex items-center gap-2" role="group" aria-labelledby={`label-${field.id}`}>
          <span className="text-xs text-muted-foreground">{field.ratingMin}</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
              onClick={() => !preview && onChange(String(n))}
              aria-pressed={strVal === String(n)}
              className={`focus-ring w-11 h-11 rounded-xl border text-sm font-medium transition-colors ${strVal === String(n) ? 'bg-pop-solid border-pop-solid text-white' : 'border-input hover:border-pop-550/50'}`}>
              {n}
            </button>
          ))}
          <span className="text-xs text-muted-foreground">{field.ratingMax}</span>
        </div>
      )}
      {field.type === 'file_upload' && !preview && (
        <FileDropzone
          accept="image/png,image/jpeg,image/webp,.pdf"
          label={t('forms.attach_file')}
          hint={t('forms.attach_hint')}
          selectedName={fileValue?.name ?? null}
          onFiles={list => { if (list[0]) onFile(list[0]) }}
          // Keeps the field's <label htmlFor> pointing at the real control, so
          // it stays announced and still opens the picker when clicked.
          inputId={`file-input-${field.id}`}
          aria-labelledby={`label-${field.id}`}
        />
      )}

      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}

      {/* Conditional follow-up */}
      {activeFollowUp && (
        <div className="ml-6 mt-2 animate-in fade-in">
          <FieldInput
            field={{ ...activeFollowUp.field, id: `${field.id}_fu`, follow_ups: [] } as FormField}
            value={allAnswers[`${field.id}_fu`]}
            fileValue={undefined}
            error={undefined}
            preview={preview}
            onChange={val => onAnswerChange(`${field.id}_fu`, val)}
            onFile={() => {}}
            allAnswers={allAnswers}
            onAnswerChange={onAnswerChange}
          />
        </div>
      )}
    </div>
  )
}
