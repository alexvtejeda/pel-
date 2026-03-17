'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCheck,
  faChevronDown,
  faSpinner,
  faTimes,
  faPaw,
  faComments,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import {
  Submission,
  listSubmissions,
  getSubmission,
  reviewSubmission,
} from '@/lib/api/submissions'
import { Form, FormField } from '@/lib/api/forms'
import { getForm } from '@/lib/api/forms'
import { useTranslation } from 'react-i18next'
import { AgendaItem } from './agenda-tab'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_LABELS: Record<Submission['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

const STATUS_CLASSES: Record<Submission['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-destructive/10 text-destructive',
}

// ─── List View ────────────────────────────────────────────────

interface PetSuggestion {
  pet_id: string
  pet_name: string
  pet_photo_url?: string
  count: number
}

interface ListViewProps {
  submissions: Submission[]
  loading: boolean
  filter: StatusFilter
  onFilterChange: (f: StatusFilter) => void
  onSelect: (id: string) => void
  petSearch: string
  onPetSearchChange: (v: string) => void
  selectedPetId: string | null
  onSelectPet: (petId: string | null) => void
  petSuggestions: PetSuggestion[]
}

function ListView({ submissions, loading, filter, onFilterChange, onSelect, petSearch, onPetSearchChange, selectedPetId, onSelectPet, petSuggestions }: ListViewProps) {
  const { t } = useTranslation('pets')
  const [showPetDropdown, setShowPetDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowPetDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredSuggestions = useMemo(() => {
    if (!petSearch.trim()) return []
    const q = petSearch.toLowerCase()
    return petSuggestions.filter(s => s.pet_name.toLowerCase().includes(q))
  }, [petSearch, petSuggestions])

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex items-center gap-3">
        {/* Pet search */}
        <div ref={searchRef} className="relative flex-1">
          <div className="flex items-center gap-2 rounded-xl border border-input px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder={t('interested.search_placeholder')}
              value={petSearch}
              onChange={e => {
                onPetSearchChange(e.target.value)
                setShowPetDropdown(e.target.value.trim().length > 0)
                if (!e.target.value.trim()) onSelectPet(null)
              }}
              onFocus={() => { if (petSearch.trim()) setShowPetDropdown(true) }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {selectedPetId && (
              <button
                type="button"
                onClick={() => { onPetSearchChange(''); onSelectPet(null) }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
              </button>
            )}
          </div>
          {showPetDropdown && filteredSuggestions.length > 0 && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border bg-card shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {filteredSuggestions.map(s => (
                <button
                  key={s.pet_id}
                  type="button"
                  onMouseDown={() => {
                    onSelectPet(s.pet_id)
                    onPetSearchChange(s.pet_name)
                    setShowPetDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                >
                  {s.pet_photo_url ? (
                    <img src={s.pet_photo_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faPaw} className="w-3 h-3 text-muted-foreground/40" />
                    </div>
                  )}
                  <span className="text-sm font-medium flex-1 truncate">{s.pet_name}</span>
                  <span className="text-xs text-muted-foreground">{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filter */}
        <div className="relative shrink-0">
          <select
            value={filter}
            onChange={e => onFilterChange(e.target.value as StatusFilter)}
            className="appearance-none pl-3 pr-8 py-1.5 border border-input rounded-xl text-sm bg-background focus:outline-hidden focus:ring-2 focus:ring-ring"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none"
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {!loading && submissions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay solicitudes{filter !== 'all' ? ` con estado "${STATUS_LABELS[filter as Submission['status']]}"` : ''}.
        </div>
      )}

      {!loading && submissions.map(sub => (
        <button
          key={sub.id}
          onClick={() => onSelect(sub.id)}
          className="w-full text-left rounded-2xl border bg-card p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors"
        >
          {/* Pet photo */}
          {sub.pet_photo_url ? (
            <img
              src={sub.pet_photo_url}
              alt={sub.pet_name || ''}
              className="w-10 h-10 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faPaw} className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {sub.pet_name || 'Mascota'}
              {sub.form_name && (
                <span className="text-muted-foreground font-normal"> &middot; {sub.form_name}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {sub.member_name || 'Solicitante'}
              {' &middot; '}
              {formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true, locale: es })}
            </p>
          </div>

          {/* Status pill */}
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-xl ${STATUS_CLASSES[sub.status]}`}>
            {STATUS_LABELS[sub.status]}
          </span>
        </button>
      ))}
    </div>
  )
}

// ─── Detail View ──────────────────────────────────────────────

interface DetailViewProps {
  submission: Submission
  form: Form | null
  onBack: () => void
  onReview: (status: 'approved' | 'rejected', note?: string) => Promise<void>
}

function DetailView({ submission, form, onBack, onReview }: DetailViewProps) {
  const [reviewing, setReviewing] = useState(false)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const handleApprove = async () => {
    setReviewing(true)
    await onReview('approved')
    setReviewing(false)
  }

  const handleReject = async () => {
    setReviewing(true)
    await onReview('rejected', rejectNote || undefined)
    setReviewing(false)
    setShowRejectBox(false)
  }

  // Build a map from field.id -> FormField for labels/sections
  const fieldMap = new Map<string, FormField>()
  if (form) {
    for (const f of form.fields) {
      fieldMap.set(f.id, f)
    }
  }

  // Group answers by section
  let lastSection = ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-accent rounded-xl transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {submission.pet_name || 'Mascota'}
            <span className="text-muted-foreground font-normal"> &middot; {submission.member_name || 'Solicitante'}</span>
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-xl ${STATUS_CLASSES[submission.status]}`}>
          {STATUS_LABELS[submission.status]}
        </span>
      </div>

      {/* Answers */}
      <div className="space-y-4">
        {Object.entries(submission.answers).map(([fieldId, answer]) => {
          const field = fieldMap.get(fieldId)
          const section = field?.section || ''
          const showSectionHeader = section && section !== lastSection
          if (section) lastSection = section

          // Check if answer looks like a file URL
          const answerStr = Array.isArray(answer) ? answer.join(', ') : answer
          const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(answerStr)

          return (
            <div key={fieldId}>
              {showSectionHeader && (
                <div className="flex items-center gap-3 mt-6 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section}
                  </span>
                  <div className="flex-1 border-t border-border" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{field?.label || fieldId}</p>
                {isImage ? (
                  <img
                    src={answerStr}
                    alt={field?.label || 'Archivo'}
                    className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setLightboxUrl(answerStr)}
                  />
                ) : (
                  <p className="text-sm">{answerStr || '—'}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      {submission.status === 'pending' && (
        <div className="border-t border-border pt-4 space-y-3">
          {showRejectBox && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Motivo del rechazo (opcional)</label>
              <textarea
                rows={2}
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-background"
              />
              <button
                onClick={handleReject}
                disabled={reviewing}
                className="px-6 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                {reviewing ? 'Procesando...' : 'Confirmar rechazo'}
              </button>
            </div>
          )}

          {!showRejectBox && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowRejectBox(true)}
                disabled={reviewing}
                className="px-6 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                Rechazar
              </button>
              <button
                onClick={handleApprove}
                disabled={reviewing}
                className="px-6 py-2.5 bg-pop-550 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {reviewing ? 'Procesando...' : 'Aprobar solicitud'}
              </button>
            </div>
          )}
        </div>
      )}

      {submission.status === 'approved' && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
            Chat iniciado
            <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
          </p>
        </div>
      )}

      {submission.status === 'rejected' && submission.rejection_note && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Motivo del rechazo</p>
          <p className="text-sm text-destructive">{submission.rejection_note}</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <FontAwesomeIcon icon={faTimes} className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Vista ampliada"
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────

interface InterestedTabProps {
  onAddToAgenda: (item: Omit<AgendaItem, 'id'>) => void
  targetSubmissionId?: string | null
  onTargetHandled?: () => void
}

export function InterestedTab({ onAddToAgenda: _onAddToAgenda, targetSubmissionId, onTargetHandled }: InterestedTabProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  const [petSearch, setPetSearch] = useState('')
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    const params = filter === 'all' ? undefined : { status: filter as Submission['status'] }
    const { data } = await listSubmissions(params)
    setSubmissions(data || [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // Auto-open target submission when navigating from PetsTab
  useEffect(() => {
    if (targetSubmissionId && !loading && submissions.length > 0) {
      const found = submissions.find(s => s.id === targetSubmissionId)
      if (found) {
        handleSelect(targetSubmissionId)
      }
      onTargetHandled?.()
    }
  }, [targetSubmissionId, loading, submissions]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build pet suggestions from submissions (deduplicated)
  const petSuggestions = useMemo<PetSuggestion[]>(() => {
    const map = new Map<string, PetSuggestion>()
    for (const sub of submissions) {
      const existing = map.get(sub.pet_id)
      if (existing) {
        existing.count++
      } else {
        map.set(sub.pet_id, {
          pet_id: sub.pet_id,
          pet_name: sub.pet_name || 'Mascota',
          pet_photo_url: sub.pet_photo_url,
          count: 1,
        })
      }
    }
    return Array.from(map.values())
  }, [submissions])

  // Filter submissions by selected pet
  const displayedSubmissions = useMemo(() => {
    if (!selectedPetId) return submissions
    return submissions.filter(s => s.pet_id === selectedPetId)
  }, [submissions, selectedPetId])

  const handleSelect = async (id: string) => {
    setSelectedId(id)
    const { data } = await getSubmission(id)
    if (data) {
      setSelectedSub(data)
      // Load form for field labels
      const { data: formData } = await getForm(data.form_id)
      setSelectedForm(formData)
    }
  }

  const handleBack = () => {
    setSelectedId(null)
    setSelectedSub(null)
    setSelectedForm(null)
  }

  const handleReview = async (status: 'approved' | 'rejected', note?: string) => {
    if (!selectedId) return
    const { data } = await reviewSubmission(selectedId, {
      status,
      rejection_note: note,
    })
    if (data) {
      setSelectedSub(data)
      // Update in list
      setSubmissions(prev =>
        prev.map(s => (s.id === selectedId ? { ...s, status: data.status } : s))
      )
    }
  }

  if (selectedId && selectedSub) {
    return (
      <DetailView
        submission={selectedSub}
        form={selectedForm}
        onBack={handleBack}
        onReview={handleReview}
      />
    )
  }

  return (
    <ListView
      submissions={displayedSubmissions}
      loading={loading}
      filter={filter}
      onFilterChange={setFilter}
      onSelect={handleSelect}
      petSearch={petSearch}
      onPetSearchChange={setPetSearch}
      selectedPetId={selectedPetId}
      onSelectPet={setSelectedPetId}
      petSuggestions={petSuggestions}
    />
  )
}
