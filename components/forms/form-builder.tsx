'use client'

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAlignLeft, faAlignJustify, faListCheck, faSquareCheck,
  faSort, faCalendar, faStar, faFile, faTrash, faPlus,
  faGripVertical, faGripLines, faCopy, faFloppyDisk,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FormField, FieldType } from '@/lib/api/forms'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface FormBuilderProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
  formName?: string
  onNameChange?: (name: string) => void
  /** Rendered above the title card, inside the same column — use for logo upload */
  headerSlot?: React.ReactNode
  /** Called when the user clicks the save button in the toolbar */
  onSave?: () => void
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type FieldTypeDef = { type: FieldType; labelKey: string; icon: IconDefinition }

const FIELD_TYPES: FieldTypeDef[] = [
  { type: 'short_text',      labelKey: 'forms.field_short_text',      icon: faAlignLeft },
  { type: 'long_text',       labelKey: 'forms.field_long_text',       icon: faAlignJustify },
  { type: 'multiple_choice', labelKey: 'forms.field_multiple_choice', icon: faListCheck },
  { type: 'checkbox',        labelKey: 'forms.field_checkbox',        icon: faSquareCheck },
  { type: 'dropdown',        labelKey: 'forms.field_dropdown',        icon: faSort },
  { type: 'date',            labelKey: 'forms.field_date',            icon: faCalendar },
  { type: 'rating',          labelKey: 'forms.field_rating',          icon: faStar },
  { type: 'file_upload',     labelKey: 'forms.field_file',            icon: faFile },
]

const HAS_OPTIONS: FieldType[] = ['multiple_choice', 'checkbox', 'dropdown']

function typeInfo(type: FieldType) {
  return FIELD_TYPES.find(f => f.type === type)!
}

function makeField(type: FieldType): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    description: '',
    required: false,
    section: '',
    options: HAS_OPTIONS.includes(type) ? [''] : [],
    ratingMin: '',
    ratingMax: '',
    follow_ups: [],
  }
}

/* ------------------------------------------------------------------ */
/*  Section grouping helper                                            */
/* ------------------------------------------------------------------ */

interface SectionGroup {
  name: string
  fields: FormField[]
  sectionIndex: number  // 1-based among named sections
  totalSections: number
}

function groupFieldsBySections(fields: FormField[]): SectionGroup[] {
  const groups: SectionGroup[] = []
  let current: SectionGroup | null = null

  for (const field of fields) {
    const sectionName = field.section || ''
    if (!current || current.name !== sectionName) {
      current = { name: sectionName, fields: [field], sectionIndex: 0, totalSections: 0 }
      groups.push(current)
    } else {
      current.fields.push(field)
    }
  }

  // Number only named sections
  const namedGroups = groups.filter(g => g.name !== '')
  namedGroups.forEach((g, i) => {
    g.sectionIndex = i + 1
    g.totalSections = namedGroups.length
  })

  return groups
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FormBuilder({ fields, onChange, formName, onNameChange, headerSlot, onSave }: FormBuilderProps) {
  const { t } = useTranslation('pets')
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const dragIndexRef = useRef<number | null>(null)

  /* ---------- Field helpers ---------- */

  const updateField = (id: string, changes: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...changes } : f))
  }

  const addFieldOfType = (type: FieldType) => {
    const f = makeField(type)
    const idx = activeFieldId ? fields.findIndex(ff => ff.id === activeFieldId) : -1
    if (idx >= 0) {
      // Inherit section from the active field
      f.section = fields[idx].section
      const next = [...fields]
      next.splice(idx + 1, 0, f)
      onChange(next)
    } else {
      // Inherit section from last field if any
      if (fields.length > 0) {
        f.section = fields[fields.length - 1].section
      }
      onChange([...fields, f])
    }
    setActiveFieldId(f.id)
  }

  const deleteField = (id: string) => {
    onChange(fields.filter(f => f.id !== id))
    if (activeFieldId === id) setActiveFieldId(null)
  }

  const duplicateField = (id: string) => {
    const original = fields.find(f => f.id === id)
    if (!original) return
    const copy: FormField = {
      ...original,
      id: crypto.randomUUID(),
      follow_ups: original.follow_ups.map(fu => ({
        ...fu,
        field: { ...fu.field, id: crypto.randomUUID() },
      })),
    }
    const idx = fields.findIndex(f => f.id === id)
    const next = [...fields]
    next.splice(idx + 1, 0, copy)
    onChange(next)
    setActiveFieldId(copy.id)
  }

  const changeFieldType = (id: string, newType: FieldType) => {
    const changes: Partial<FormField> = { type: newType }
    if (!HAS_OPTIONS.includes(newType)) {
      changes.options = []
      changes.follow_ups = []
    } else {
      const existing = fields.find(f => f.id === id)
      if (!existing?.options?.length) changes.options = ['']
      // Drop follow-ups for checkbox (not supported)
      if (newType === 'checkbox') changes.follow_ups = []
    }
    updateField(id, changes)
  }

  /* ---------- Option helpers ---------- */

  const addOption = (id: string) =>
    updateField(id, { options: [...(fields.find(f => f.id === id)?.options ?? []), ''] })

  const updateOption = (id: string, i: number, val: string) =>
    updateField(id, { options: fields.find(f => f.id === id)!.options.map((o, j) => j === i ? val : o) })

  const deleteOption = (id: string, i: number) => {
    const field = fields.find(f => f.id === id)!
    const removedOpt = field.options[i]
    updateField(id, {
      options: field.options.filter((_, j) => j !== i),
      follow_ups: field.follow_ups.filter(fu => fu.when_answer !== removedOpt),
    })
  }

  /* ---------- Follow-up helpers ---------- */

  const addFollowUp = (fieldId: string, whenAnswer: string) => {
    const sub: Omit<FormField, 'follow_ups'> = {
      id: crypto.randomUUID(),
      type: 'short_text',
      label: '',
      description: '',
      required: false,
      section: '',
      options: [],
      ratingMin: '',
      ratingMax: '',
    }
    updateField(fieldId, {
      follow_ups: [
        ...(fields.find(f => f.id === fieldId)?.follow_ups ?? []),
        { when_answer: whenAnswer, field: sub },
      ],
    })
  }

  const deleteFollowUp = (fieldId: string, when: string) =>
    updateField(fieldId, {
      follow_ups: fields.find(f => f.id === fieldId)!.follow_ups.filter(fu => fu.when_answer !== when),
    })

  const updateFollowUpField = (parentId: string, when: string, changes: Partial<FormField>) => {
    updateField(parentId, {
      follow_ups: fields.find(f => f.id === parentId)!.follow_ups.map(fu =>
        fu.when_answer === when ? { ...fu, field: { ...fu.field, ...changes } } : fu
      ),
    })
  }

  /* ---------- Drag & drop ---------- */

  const handleDragStart = (i: number) => { dragIndexRef.current = i }

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndexRef.current === null || dragIndexRef.current === i) return
    const next = [...fields]
    const [moved] = next.splice(dragIndexRef.current!, 1)
    // When dragging between sections, adopt the target's section
    if (next[i]) moved.section = next[i].section
    else if (next[i - 1]) moved.section = next[i - 1].section
    next.splice(i, 0, moved)
    dragIndexRef.current = i
    onChange(next)
  }

  const handleDrop = () => { dragIndexRef.current = null }

  /* ---------- Section helpers ---------- */

  const addSectionDivider = () => {
    const name = prompt('Nombre de la sección:')
    if (!name?.trim()) return
    // Set section on all fields after the active one (or from end) until next section boundary
    const idx = activeFieldId ? fields.findIndex(f => f.id === activeFieldId) : fields.length - 1
    const insertIdx = idx + 1
    if (insertIdx >= fields.length) {
      // No fields after — just add a new field with this section
      const f = makeField('short_text')
      f.section = name.trim()
      onChange([...fields, f])
      setActiveFieldId(f.id)
      return
    }
    // Mark the field at insertIdx and consecutive same-section fields
    const oldSection = fields[insertIdx].section
    const next = fields.map((f, i) => {
      if (i >= insertIdx && f.section === oldSection) {
        return { ...f, section: name.trim() }
      }
      return f
    })
    onChange(next)
  }

  const deleteSection = (sectionName: string) => {
    // Find the group before this section and merge into it
    const groups = groupFieldsBySections(fields)
    const groupIdx = groups.findIndex(g => g.name === sectionName)
    if (groupIdx < 0) return
    // Merge into previous group's section (or empty if first)
    const prevSection = groupIdx > 0 ? groups[groupIdx - 1].name : ''
    onChange(fields.map(f => f.section === sectionName ? { ...f, section: prevSection } : f))
  }

  /* ---------- Rendering helpers ---------- */

  const contentHint = (field: FormField) => {
    switch (field.type) {
      case 'short_text': return <span className="text-sm text-muted-foreground">{t('forms.field_short_text')}</span>
      case 'long_text': return <span className="text-sm text-muted-foreground">{t('forms.field_long_text')}</span>
      case 'date': return <span className="text-sm text-muted-foreground">{t('forms.field_date_format')}</span>
      case 'file_upload': return <span className="text-sm text-muted-foreground">{t('forms.field_upload')}</span>
      case 'rating': return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {field.ratingMin} — {field.ratingMax}
        </div>
      )
      case 'multiple_choice':
        return (
          <div className="space-y-1">
            {field.options.slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                <span className="truncate">{o || t('forms.option_placeholder', { n: i + 1 })}</span>
              </div>
            ))}
            {field.options.length > 3 && (
              <span className="text-xs text-muted-foreground">{t('forms.more_options', { count: field.options.length - 3 })}</span>
            )}
          </div>
        )
      case 'checkbox':
        return (
          <div className="space-y-1">
            {field.options.slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-3.5 h-3.5 rounded-2xl border border-muted-foreground/40 shrink-0" />
                <span className="truncate">{o || t('forms.option_placeholder', { n: i + 1 })}</span>
              </div>
            ))}
            {field.options.length > 3 && (
              <span className="text-xs text-muted-foreground">{t('forms.more_options', { count: field.options.length - 3 })}</span>
            )}
          </div>
        )
      case 'dropdown':
        return (
          <div className="space-y-1">
            {field.options.slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs w-4 text-right shrink-0">{i + 1}.</span>
                <span className="truncate">{o || t('forms.option_placeholder', { n: i + 1 })}</span>
              </div>
            ))}
            {field.options.length > 3 && (
              <span className="text-xs text-muted-foreground">{t('forms.more_options', { count: field.options.length - 3 })}</span>
            )}
          </div>
        )
      default: return null
    }
  }

  /* ---------- Render: selected card ---------- */

  const renderSelectedCard = (field: FormField, flatIndex: number) => (
    <motion.div
      key={field.id}
      layout
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ layout: { duration: 0.2, ease: 'easeOut' } }}
      draggable
      onDragStart={() => handleDragStart(flatIndex)}
      onDragOver={e => handleDragOver(e, flatIndex)}
      onDrop={handleDrop}
      className="rounded-2xl border border-input border-l-4 border-l-pop-550 bg-card p-5 space-y-4"
    >
      {/* Drag handle */}
      <div className="flex justify-center -mt-2 mb-1">
        <FontAwesomeIcon icon={faGripVertical} className="text-xs text-muted-foreground/40 cursor-grab" />
      </div>

      {/* Top row: label + type selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={field.label}
          onChange={e => updateField(field.id, { label: e.target.value })}
          placeholder={t('forms.untitled_question')}
          className="flex-1 rounded-xl border-0 border-b-2 border-b-muted-foreground/30 rounded-b-none px-1 text-base font-medium focus-visible:border-b-pop-550 focus-visible:ring-0"
        />
        <select
          value={field.type}
          onChange={e => changeFieldType(field.id, e.target.value as FieldType)}
          className="px-3 py-2 border border-input rounded-xl text-sm bg-background focus:outline-hidden focus:ring-2 focus:ring-ring shrink-0"
        >
          {FIELD_TYPES.map(({ type, labelKey, icon }) => (
            <option key={type} value={type}>{t(labelKey)}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <Input
        value={field.description}
        onChange={e => updateField(field.id, { description: e.target.value })}
        placeholder={t('forms.description_placeholder')}
        className="rounded-xl text-sm text-muted-foreground"
      />

      {/* Section */}
      <Input
        value={field.section}
        onChange={e => updateField(field.id, { section: e.target.value })}
        placeholder={t('forms.section_placeholder')}
        className="rounded-xl text-sm"
      />

      {/* Options for multiple_choice / checkbox / dropdown */}
      {HAS_OPTIONS.includes(field.type) && (
        <div className="space-y-2">
          {field.options.map((opt, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2">
                {/* Visual indicator */}
                {field.type === 'multiple_choice' && (
                  <span className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                )}
                {field.type === 'checkbox' && (
                  <span className="w-4 h-4 rounded-2xl border-2 border-muted-foreground/40 shrink-0" />
                )}
                {field.type === 'dropdown' && (
                  <span className="text-sm text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                )}
                <Input
                  value={opt}
                  onChange={e => updateOption(field.id, idx, e.target.value)}
                  placeholder={t('forms.option_placeholder', { n: idx + 1 })}
                  className="rounded-xl flex-1"
                />
                <Button
                  variant="ghost" size="icon"
                  className="rounded-xl shrink-0 text-destructive hover:text-destructive h-8 w-8"
                  onClick={() => deleteOption(field.id, idx)}
                  disabled={field.options.length <= 1}
                >
                  <FontAwesomeIcon icon={faTrash} className="text-sm" />
                </Button>
              </div>

              {/* Follow-up link for multiple_choice / dropdown */}
              {(field.type === 'multiple_choice' || field.type === 'dropdown') && opt.trim() && (
                <div className="ml-6">
                  {field.follow_ups?.find(fu => fu.when_answer === opt) ? (
                    <div className="mt-1 p-3 rounded-xl border border-dashed border-muted space-y-2">
                      <p className="text-xs text-muted-foreground">{t('forms.follow_up_when', { answer: opt })}</p>
                      <Input
                        value={field.follow_ups.find(fu => fu.when_answer === opt)!.field.label}
                        onChange={e => updateFollowUpField(field.id, opt, { label: e.target.value })}
                        placeholder={t('forms.follow_up_placeholder')}
                        className="rounded-xl text-sm"
                      />
                      <button
                        onClick={() => deleteFollowUp(field.id, opt)}
                        className="text-xs text-destructive hover:underline"
                      >
                        {t('forms.follow_up_delete')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addFollowUp(field.id, opt)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {t('forms.follow_up_add')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addOption(field.id)}>
            <FontAwesomeIcon icon={faPlus} className="text-sm mr-1" /> {t('forms.add_option')}
          </Button>
        </div>
      )}

      {/* Rating labels */}
      {field.type === 'rating' && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">{t('forms.rating_min_label')}</p>
            <Input
              value={field.ratingMin}
              onChange={e => updateField(field.id, { ratingMin: e.target.value })}
              placeholder={t('forms.rating_min_default')}
              className="rounded-xl"
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">{t('forms.rating_max_label')}</p>
            <Input
              value={field.ratingMax}
              onChange={e => updateField(field.id, { ratingMax: e.target.value })}
              placeholder={t('forms.rating_max_default')}
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Bottom toolbar: required toggle | duplicate | delete */}
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-muted-foreground">{t('forms.required')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={field.required}
            onClick={() => updateField(field.id, { required: !field.required })}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              field.required ? 'bg-pop-550' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-background transition-transform ${
                field.required ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <div className="h-5 w-px bg-border" />

        <Button
          variant="ghost" size="icon"
          className="rounded-xl h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => duplicateField(field.id)}
          title={t('forms.duplicate')}
        >
          <FontAwesomeIcon icon={faCopy} className="text-sm" />
        </Button>

        <Button
          variant="ghost" size="icon"
          className="rounded-xl h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => deleteField(field.id)}
          title={t('forms.delete_field')}
        >
          <FontAwesomeIcon icon={faTrash} className="text-sm" />
        </Button>
      </div>
    </motion.div>
  )

  /* ---------- Render: collapsed card ---------- */

  const renderCollapsedCard = (field: FormField, flatIndex: number) => (
    <motion.div
      key={field.id}
      layout
      transition={{ layout: { duration: 0.2, ease: 'easeOut' } }}
      draggable
      onDragStart={() => handleDragStart(flatIndex)}
      onDragOver={e => handleDragOver(e, flatIndex)}
      onDrop={handleDrop}
      onClick={() => setActiveFieldId(field.id)}
      className="group rounded-2xl border border-border bg-card p-4 cursor-pointer hover:border-muted-foreground/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        <FontAwesomeIcon
          icon={faGripVertical}
          className="text-xs text-muted-foreground/0 group-hover:text-muted-foreground/40 cursor-grab shrink-0 mt-1 transition-colors"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {field.label || <span className="text-muted-foreground italic">{t('forms.untitled_question')}</span>}
            {field.required && <span className="text-lg text-amber-600 ml-1">*</span>}
          </p>
          <div className="mt-1">{contentHint(field)}</div>
        </div>
      </div>
    </motion.div>
  )

  /* ---------- Render: right toolbar (desktop) ---------- */

  const renderToolbar = () => (
    <div className="hidden md:flex flex-col gap-1 rounded-2xl border border-border bg-card p-2 sticky top-4">
      {FIELD_TYPES.map(({ type, labelKey, icon }) => (
        <button
          key={type}
          onClick={() => addFieldOfType(type)}
          title={t(labelKey)}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <FontAwesomeIcon icon={icon} className="text-base" />
        </button>
      ))}
      <div className="h-px bg-border my-1" />
      <button
        onClick={addSectionDivider}
        title={t('forms.section_divider')}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <FontAwesomeIcon icon={faGripLines} className="text-base" />
      </button>
      {onSave && (
        <>
          <div className="h-px bg-border my-1" />
          <button
            onClick={onSave}
            title={t('forms.save_form')}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <FontAwesomeIcon icon={faFloppyDisk} className="text-base" />
          </button>
        </>
      )}
    </div>
  )

  /* ---------- Render: mobile FAB ---------- */

  const renderMobileFab = () => (
    <div className="md:hidden fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-14 h-14 rounded-full bg-pop-550 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity">
            <FontAwesomeIcon icon={faPlus} className="text-xl" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {FIELD_TYPES.map(({ type, labelKey, icon }) => (
            <DropdownMenuItem key={type} onClick={() => addFieldOfType(type)}>
              <FontAwesomeIcon icon={icon} className="text-sm mr-2" />
              {t(labelKey)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={addSectionDivider}>
            <FontAwesomeIcon icon={faGripLines} className="text-sm mr-2" />
            {t('forms.section_divider')}
          </DropdownMenuItem>
          {onSave && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSave}>
                <FontAwesomeIcon icon={faFloppyDisk} className="text-sm mr-2" />
                {t('forms.save_form')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  /* ---------- Main render ---------- */

  const sectionGroups = groupFieldsBySections(fields)

  // Build a flat index map: field.id -> index in the flat fields array
  const flatIndexMap = new Map<string, number>()
  fields.forEach((f, i) => flatIndexMap.set(f.id, i))

  return (
    <div className="flex gap-3 items-start justify-center">
      {/* Main column */}
      <div className="max-w-2xl w-full flex flex-col gap-3">
        {/* Header slot (e.g., logo upload) */}
        {headerSlot}

        {/* Title card */}
        {formName !== undefined && (
          <div className="rounded-2xl border border-border bg-card border-t-4 border-t-pop-550 p-5">
            <input
              type="text"
              value={formName}
              onChange={e => onNameChange?.(e.target.value)}
              placeholder={t('forms.untitled_form')}
              className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Field cards grouped by section */}
        {fields.length === 0 ? (
          <div className="self-center rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <FontAwesomeIcon icon={faPlus} className="text-2xl text-muted-foreground/30" />
            <p>{t('forms.empty_builder')}</p>
          </div>
        ) : (
          sectionGroups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-3">
              {/* Section pill tab */}
              {group.name !== '' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted text-sm font-medium">
                    {t('forms.section_label', { current: group.sectionIndex, total: group.totalSections, name: group.name })}
                    <button
                      onClick={() => deleteSection(group.name)}
                      className="text-muted-foreground hover:text-foreground transition-colors ml-1"
                      title={t('forms.section_delete')}
                    >
                      &times;
                    </button>
                  </span>
                </div>
              )}

              {/* Field cards in this group */}
              {group.fields.map(field => {
                const flatIdx = flatIndexMap.get(field.id)!
                return field.id === activeFieldId
                  ? renderSelectedCard(field, flatIdx)
                  : renderCollapsedCard(field, flatIdx)
              })}
            </div>
          ))
        )}
      </div>

      {/* Right toolbar (desktop) */}
      {renderToolbar()}

      {/* Mobile FAB */}
      {renderMobileFab()}
    </div>
  )
}
