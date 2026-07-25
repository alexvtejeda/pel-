'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faInbox, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Form, FormField, listForms, getForm, createForm, updateForm } from '@/lib/api/forms'
import { SubmissionListItem, listFormSubmissions } from '@/lib/api/submissions'
import { LogoUpload } from './logo-upload'
import { FormBuilder } from '@/components/forms/form-builder'
import { FormRenderer } from '@/components/forms/form-renderer'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'

type SubStatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const SUB_STATUS_CLASSES: Record<SubmissionListItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-destructive/10 text-destructive',
}

interface FormsTabProps {
  onDirtyChange?: (dirty: boolean) => void
  onSaveRef?: React.RefObject<(() => Promise<void>) | null>
  onNavigateToInterested?: () => void
}

export function FormsTab({ onDirtyChange, onSaveRef, onNavigateToInterested }: FormsTabProps) {
  const { t } = useTranslation('pets')
  const [forms, setForms]               = useState<Form[]>([])
  const [activeFormId, setActiveFormId] = useState<string | null>(null)
  const [fields, setFields]             = useState<FormField[]>([])
  const [view, setView]                 = useState<'edit' | 'preview' | 'submissions'>('edit')
  const [submissions, setSubmissions]   = useState<SubmissionListItem[]>([])
  const [loadingSubs, setLoadingSubs]   = useState(false)
  const [statusFilter, setStatusFilter] = useState<SubStatusFilter>('all')
  const [dirty, setDirty]               = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saveMsg, setSaveMsg]           = useState('')
  const [logoUrl, setLogoUrl]           = useState<string | null>(null)
  const [rcName, setRcName]             = useState('')
  const [loadingForms, setLoadingForms] = useState(true)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const activeForm = forms.find(f => f.id === activeFormId) ?? null

  // Notify parent when dirty state changes
  const markDirty = (d: boolean) => { setDirty(d); onDirtyChange?.(d) }

  // Guard: if dirty, show dialog instead of executing immediately
  const guardedAction = (action: () => void) => {
    if (dirty) { setPendingAction(() => action); return }
    action()
  }

  // Load RC info and forms on mount
  useEffect(() => {
    const init = async () => {
      const [rcRes, formsRes] = await Promise.all([getMyRescueCenter(), listForms()])
      if (rcRes.data) { setLogoUrl(rcRes.data.logo_url ?? null); setRcName(rcRes.data.name) }
      if (formsRes.data && formsRes.data.length > 0) {
        setForms(formsRes.data)
        const first = formsRes.data[0]
        setActiveFormId(first.id)
        setFields(first.fields)
      }
      setLoadingForms(false)
    }
    init()
  }, [])

  // When active form changes, reload its fields
  const doSwitchForm = useCallback(async (formId: string) => {
    setActiveFormId(formId)
    const { data } = await getForm(formId)
    if (data) { setFields(data.fields); markDirty(false) }
  }, [])

  const switchForm = (formId: string) => {
    guardedAction(() => doSwitchForm(formId))
  }

  // Save
  const handleSave = async () => {
    if (!activeFormId) return
    setSaving(true)
    const { error } = await updateForm(activeFormId, { fields })
    setSaving(false)
    if (error) { setSaveMsg(`Error: ${error}`); return }
    markDirty(false)
    setSaveMsg(t('forms.saved'))
    setTimeout(() => setSaveMsg(''), 2000)
  }

  // Expose save to parent via ref
  useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSave
    return () => { if (onSaveRef) onSaveRef.current = null }
  })

  // Create new form
  const handleCreateForm = async () => {
    const name = window.prompt('Nombre del formulario:')
    if (!name?.trim()) return
    const isSpecial = window.confirm('¿Es un formulario para mascotas con condiciones especiales?')
    const { data, error } = await createForm({ name: name.trim(), is_special_needs: isSpecial })
    if (error || !data) return
    setForms(prev => [...prev, data])
    setActiveFormId(data.id)
    setFields(data.fields)
    markDirty(false)
  }

  // Load this form's submissions when the Solicitudes view is active
  useEffect(() => {
    if (view !== 'submissions' || !activeFormId) return
    let cancelled = false
    setLoadingSubs(true)
    const load = async () => {
      const { data } = await listFormSubmissions(
        activeFormId,
        statusFilter === 'all' ? undefined : statusFilter,
      )
      if (cancelled) return
      setSubmissions(data ?? [])
      setLoadingSubs(false)
    }
    load()
    return () => { cancelled = true }
  }, [view, activeFormId, statusFilter])

  if (loadingForms) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-pop-550 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: form selector + Edit/Preview tabs + Save */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Form selector */}
        <div className="relative">
          <select
            value={activeFormId ?? ''}
            onChange={e => {
              if (e.target.value === '__create__') { handleCreateForm(); return }
              switchForm(e.target.value)
            }}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {forms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            <option value="__create__">{t('forms.create_form')}</option>
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs" />
        </div>

        {/* Edit/Preview/Submissions switcher */}
        <div className="flex gap-1">
          {(['edit', 'preview', 'submissions'] as const).map(v => (
            <button key={v} onClick={() => v !== view && guardedAction(() => setView(v))}
              className={v === view
                ? 'px-4 py-1.5 rounded-xl bg-pop-550 text-background text-sm font-medium'
                : 'px-4 py-1.5 rounded-xl text-muted-foreground text-sm hover:bg-muted'}>
              {v === 'edit'
                ? `${t('forms.edit')}${dirty ? ' •' : ''}`
                : v === 'preview'
                  ? t('forms.preview')
                  : t('forms.submissions_tab')}
            </button>
          ))}
        </div>

        {view !== 'submissions' && (
          <div className="ml-auto">
            <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? t('forms.saving') : saveMsg || t('forms.save_form')}
            </Button>
          </div>
        )}
      </div>

      {/* Preview mode */}
      {view === 'preview' && activeForm && (
        <div className="max-w-lg mx-auto flex flex-col gap-3">
          {/* Logo card */}
          <div className="rounded-2xl border border-border overflow-hidden max-h-40">
            {logoUrl
              ? <img src={logoUrl} className="w-full h-full object-contain" alt="Rescue Center Logo" />
              : <div className="w-full h-10 bg-linear-to-r from-pop-500 to-pop-750 flex items-center justify-center">
                  <span className="text-background text-2xl font-bold">{rcName}</span>
                </div>
            }
          </div>
          {/* Form card */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <FormRenderer
              form={{ ...activeForm, fields }}
              rc={{ name: rcName, logo_url: logoUrl }}
            />
          </div>
        </div>
      )}

      {/* Submissions mode (read-only summary) */}
      {view === 'submissions' && activeForm && (
        <div className="flex flex-col gap-3">
          {/* Filter + hand-off */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as SubStatusFilter)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={t('forms.subs_col_status')}
              >
                <option value="all">{t('forms.subs_status_all')}</option>
                <option value="pending">{t('forms.subs_status_pending')}</option>
                <option value="approved">{t('forms.subs_status_approved')}</option>
                <option value="rejected">{t('forms.subs_status_rejected')}</option>
              </select>
              <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs" />
            </div>

            {onNavigateToInterested && (
              <button
                onClick={onNavigateToInterested}
                className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border border-input text-sm text-foreground hover:bg-muted"
              >
                {t('forms.review_in_interested')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
              </button>
            )}
          </div>

          {loadingSubs ? (
            <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-pop-550 border-t-transparent rounded-full animate-spin" /></div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <FontAwesomeIcon icon={faInbox} className="text-3xl" />
              <p className="text-sm">{t('forms.subs_empty')}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden">
              {/* Column labels */}
              <div className="hidden sm:grid grid-cols-[1.2fr_1.6fr_auto_auto] gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                <span>{t('forms.subs_col_pet')}</span>
                <span>{t('forms.subs_col_email')}</span>
                <span>{t('forms.subs_col_status')}</span>
                <span className="text-right">{t('forms.subs_col_date')}</span>
              </div>
              <ul className="divide-y divide-border">
                {submissions.map(s => (
                  <li key={s.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.6fr_auto_auto] gap-1 sm:gap-3 px-4 py-3 sm:items-center">
                    <span className="text-sm font-medium text-foreground truncate">{s.pet_name}</span>
                    <span className="text-sm text-muted-foreground truncate">{s.member_email}</span>
                    <span className={`justify-self-start w-fit px-2 py-0.5 rounded-full text-xs font-medium ${SUB_STATUS_CLASSES[s.status]}`}>
                      {t(`forms.subs_status_${s.status}`)}
                    </span>
                    <span className="text-xs text-muted-foreground sm:text-right tabular-nums">
                      {format(new Date(s.submitted_at), 'd MMM yyyy', { locale: es })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Edit mode */}
      {view === 'edit' && (
        <FormBuilder
          fields={fields}
          onChange={newFields => { setFields(newFields); markDirty(true) }}
          formName={activeForm?.name}
          headerSlot={<LogoUpload logoUrl={logoUrl} onUpdate={url => setLogoUrl(url)} />}
          onSave={dirty && !saving ? handleSave : undefined}
        />
      )}

      {/* Unsaved changes dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={open => { if (!open) setPendingAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('forms.unsaved_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('forms.unsaved_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>{t('cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-transparent border border-input text-foreground hover:bg-muted"
              onClick={() => { pendingAction?.(); setPendingAction(null) }}
            >
              {t('forms.unsaved_discard')}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={async () => { await handleSave(); pendingAction?.(); setPendingAction(null) }}
            >
              {t('forms.unsaved_save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
