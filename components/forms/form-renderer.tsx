'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpFromBracket, faPaw } from '@fortawesome/free-solid-svg-icons'
import { Form, FormField, FieldType } from '@/lib/api/forms'
import { TransitionLink } from '@/components/transitions/transition-link'

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
    if (preview || !onSubmit) return
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
    <div className={preview ? 'max-w-2xl mx-auto px-4 py-8 space-y-6' : 'space-y-6'}>
      <h1 className="text-2xl font-bold">{form.name}</h1>

      {!preview && requiredFields.length > 0 && (
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
          className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 className="text-base font-semibold">
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

      {!preview && (
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
  const inputCls  = `w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background ${error ? 'border-destructive ring-2 ring-destructive' : 'border-input'}`

  // Which follow-up to show (for multiple_choice / dropdown)?
  const activeFollowUp = (field.type === 'multiple_choice' || field.type === 'dropdown')
    ? field.follow_ups?.find(fu => fu.when_answer === strVal)
    : null

  return (
    <div id={`field-${field.id}`} className="space-y-2">
      <label className="block text-sm font-medium">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      {field.type === 'short_text' && (
        <input type="text" value={strVal} onChange={e => onChange(e.target.value)} className={inputCls} disabled={preview} />
      )}
      {field.type === 'long_text' && (
        <textarea rows={4} value={strVal} onChange={e => onChange(e.target.value)} className={inputCls} disabled={preview} />
      )}
      {field.type === 'date' && (
        <input type="date" value={strVal} onChange={e => onChange(e.target.value)} className={inputCls} disabled={preview} />
      )}
      {field.type === 'multiple_choice' && (
        <div className="space-y-1.5">
          {field.options.map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={field.id} value={opt}
                checked={strVal === opt} onChange={() => onChange(opt)}
                className="accent-primary" disabled={preview} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkbox' && (
        <div className="space-y-1.5">
          {field.options.map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value={opt}
                checked={arrVal.includes(opt)}
                onChange={e => {
                  if (e.target.checked) onChange([...arrVal, opt])
                  else onChange(arrVal.filter(v => v !== opt))
                }}
                className="accent-primary" disabled={preview} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'dropdown' && (
        <select value={strVal} onChange={e => onChange(e.target.value)}
          className={inputCls} disabled={preview}>
          <option value="">{t('forms.select_placeholder')}</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}
      {field.type === 'rating' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{field.ratingMin}</span>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
              onClick={() => !preview && onChange(String(n))}
              className={`focus-ring w-9 h-9 rounded-xl border text-sm font-medium transition-colors ${strVal === String(n) ? 'bg-pop-solid border-pop-solid text-white' : 'border-input hover:border-pop-550/50'}`}>
              {n}
            </button>
          ))}
          <span className="text-xs text-muted-foreground">{field.ratingMax}</span>
        </div>
      )}
      {field.type === 'file_upload' && !preview && (
        <div
          className="rounded-xl border border-dashed border-input p-6 text-center cursor-pointer hover:border-pop-550/50 transition-colors"
          onClick={() => document.getElementById(`file-input-${field.id}`)?.click()}
        >
          <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-2xl text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {fileValue ? fileValue.name : t('forms.attach_file')}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('forms.attach_hint')}</p>
          <input
            id={`file-input-${field.id}`}
            type="file"
            accept="image/png,image/jpeg,image/webp,.pdf"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
          />
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

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
