'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAlignLeft, faAlignJustify, faListCheck, faSquareCheck,
  faSort, faCalendar, faStar, faFile, faTrash, faPlus,
  faGripVertical, faChevronDown,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FieldType } from '@/lib/api/forms'
import { FormRenderer } from '@/components/forms/form-renderer'
import * as adminApi from '@/lib/api/admin'

type FieldTypeDef = { type: FieldType; label: string; icon: IconDefinition }

const FIELD_TYPES: FieldTypeDef[] = [
  { type: 'short_text',      label: 'Texto corto',       icon: faAlignLeft },
  { type: 'long_text',       label: 'Texto largo',        icon: faAlignJustify },
  { type: 'multiple_choice', label: 'Selección múltiple', icon: faListCheck },
  { type: 'checkbox',        label: 'Casillas',           icon: faSquareCheck },
  { type: 'dropdown',        label: 'Desplegable',        icon: faSort },
  { type: 'date',            label: 'Fecha',              icon: faCalendar },
  { type: 'rating',          label: 'Escala',             icon: faStar },
  { type: 'file_upload',     label: 'Archivo',            icon: faFile },
]

const HAS_OPTIONS: FieldType[] = ['multiple_choice', 'checkbox', 'dropdown']

function typeInfo(type: FieldType) { return FIELD_TYPES.find(f => f.type === type)! }

function makeField(type: FieldType): FormField {
  return {
    id: crypto.randomUUID(),
    type, label: '', description: '', required: false,
    section: '', options: HAS_OPTIONS.includes(type) ? [''] : [],
    ratingMin: 'Nada', ratingMax: 'Mucho', follow_ups: [],
  }
}

export function AdminFormTab() {
  const [fields, setFields]               = useState<FormField[]>([])
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [view, setView]                   = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty]                 = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saveMsg, setSaveMsg]             = useState('')
  const [newType, setNewType]             = useState<FieldType>('short_text')
  const [loading, setLoading]             = useState(true)

  const dragIndexRef = useRef<number | null>(null)
  const activeField = fields.find(f => f.id === activeFieldId) ?? null

  // Load master template on mount
  useEffect(() => {
    adminApi.getFormTemplate().then(({ data }) => {
      if (data) setFields(data.fields)
      setLoading(false)
    })
  }, [])

  // Save calls admin API
  const handleSave = async () => {
    setSaving(true)
    const { error } = await adminApi.updateFormTemplate({ fields })
    setSaving(false)
    if (error) { setSaveMsg(`Error: ${error}`); return }
    setDirty(false)
    setSaveMsg('Guardado ✓')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const updateField = (id: string, changes: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...changes } : f))
    setDirty(true)
  }

  const addField = () => {
    const f = makeField(newType)
    setFields(prev => [...prev, f])
    setActiveFieldId(f.id)
    setDirty(true)
  }

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (activeFieldId === id) setActiveFieldId(null)
    setDirty(true)
  }

  const addOption    = (id: string) => updateField(id, { options: [...(fields.find(f => f.id === id)?.options ?? []), ''] })
  const updateOption = (id: string, i: number, val: string) =>
    updateField(id, { options: fields.find(f => f.id === id)!.options.map((o, j) => j === i ? val : o) })
  const deleteOption = (id: string, i: number) =>
    updateField(id, { options: fields.find(f => f.id === id)!.options.filter((_, j) => j !== i) })

  // Follow-up management
  const addFollowUp = (fieldId: string, whenAnswer: string) => {
    const sub = { ...makeField('short_text'), follow_ups: [] }
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

  // HTML5 Drag-and-Drop reorder
  const handleDragStart = (i: number) => { dragIndexRef.current = i }
  const handleDragOver  = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndexRef.current === null || dragIndexRef.current === i) return
    setFields(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIndexRef.current!, 1)
      next.splice(i, 0, moved)
      dragIndexRef.current = i
      return next
    })
    setDirty(true)
  }
  const handleDrop = () => { dragIndexRef.current = null }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: Edit/Preview tabs + Save */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Edit/Preview switcher */}
        <div className="flex gap-1">
          {(['edit', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={v === view
                ? 'px-4 py-1.5 rounded-xl bg-pop-550 text-white text-sm font-medium'
                : 'px-4 py-1.5 rounded-xl text-muted-foreground text-sm hover:bg-muted'}>
              {v === 'edit' ? `Editar${dirty ? ' •' : ''}` : 'Vista previa'}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'Guardando...' : saveMsg || 'Guardar plantilla'}
          </Button>
        </div>
      </div>

      {/* Preview mode */}
      {view === 'preview' && (
        <div className="border rounded-2xl overflow-hidden">
          <FormRenderer
            form={{ id: 'preview', rescue_center_id: '', name: 'Plantilla de adopción', is_special_needs: false, fields, created_at: '', updated_at: '' }}
            rc={{ name: 'Pelú Admin', logo_url: null }}
          />
        </div>
      )}

      {/* Edit mode */}
      {view === 'edit' && (
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Left panel: field list */}
          <div className="w-full md:w-72 shrink-0 space-y-2">
            <div className="flex gap-2">
              <select value={newType} onChange={e => setNewType(e.target.value as FieldType)}
                className="flex-1 px-3 py-2 border border-input rounded-xl text-sm bg-background focus:outline-hidden focus:ring-2 focus:ring-ring">
                {FIELD_TYPES.map(({ type, label }) => <option key={type} value={type}>{label}</option>)}
              </select>
              <Button size="sm" className="rounded-xl shrink-0" onClick={addField}>
                <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-2xl">
                Agrega un campo para empezar
              </p>
            ) : (
              fields.map((field, i) => {
                const { icon } = typeInfo(field.type)
                return (
                  <div key={field.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={handleDrop}
                    onClick={() => setActiveFieldId(field.id)}
                    className={`w-full rounded-2xl border bg-card p-3 flex items-center gap-2 text-left transition-colors cursor-pointer ${activeFieldId === field.id ? 'ring-2 ring-ring' : 'hover:bg-muted/50'}`}
                  >
                    <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3 text-muted-foreground/40 cursor-grab shrink-0" />
                    <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      {field.label || <span className="text-muted-foreground italic">Sin título</span>}
                    </span>
                    {field.required && <span className="text-xs font-bold text-destructive shrink-0">*</span>}
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-xl text-destructive hover:text-destructive shrink-0"
                      onClick={e => { e.stopPropagation(); deleteField(field.id) }}>
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* Right panel: field editor */}
          <div className="flex-1 min-w-0">
            {!activeField ? (
              <div className="rounded-2xl border border-dashed flex items-center justify-center py-20 text-sm text-muted-foreground">
                Selecciona un campo para editarlo
              </div>
            ) : (
              <div className="rounded-2xl border bg-card p-6 space-y-5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {(() => { const { icon, label } = typeInfo(activeField.type); return <><FontAwesomeIcon icon={icon} className="w-3 h-3" /><span>{label}</span></> })()}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Etiqueta</label>
                  <Input value={activeField.label} onChange={e => updateField(activeField.id, { label: e.target.value })}
                    placeholder="Ej. ¿Tienes otros animales en casa?" className="rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Sección <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <Input value={activeField.section} onChange={e => updateField(activeField.id, { section: e.target.value })}
                    placeholder="Ej. Datos Personales" className="rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Descripción <span className="text-muted-foreground font-normal">(opcional)</span></label>
                  <Input value={activeField.description} onChange={e => updateField(activeField.id, { description: e.target.value })}
                    placeholder="Ayuda al adoptante a entender la pregunta" className="rounded-xl" />
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={activeField.required}
                    onChange={e => updateField(activeField.id, { required: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary" />
                  <span className="text-sm">Requerido</span>
                </label>

                {HAS_OPTIONS.includes(activeField.type) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Opciones</label>
                    {activeField.options.map((opt, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex gap-2">
                          <Input value={opt} onChange={e => updateOption(activeField.id, idx, e.target.value)}
                            placeholder={`Opción ${idx + 1}`} className="rounded-xl" />
                          <Button variant="ghost" size="icon" className="rounded-xl shrink-0 text-destructive hover:text-destructive"
                            onClick={() => deleteOption(activeField.id, idx)} disabled={activeField.options.length <= 1}>
                            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {/* Follow-up link for multiple_choice / dropdown */}
                        {(activeField.type === 'multiple_choice' || activeField.type === 'dropdown') && opt.trim() && (
                          <div className="ml-2">
                            {activeField.follow_ups?.find(fu => fu.when_answer === opt) ? (
                              <div className="ml-4 mt-1 p-2 rounded-xl border border-dashed border-muted space-y-1.5">
                                <p className="text-xs text-muted-foreground">cuando &ldquo;{opt}&rdquo;:</p>
                                <Input
                                  value={activeField.follow_ups.find(fu => fu.when_answer === opt)!.field.label}
                                  onChange={e => updateFollowUpField(activeField.id, opt, { label: e.target.value })}
                                  placeholder="Pregunta de seguimiento" className="rounded-xl text-xs" />
                                <button onClick={() => deleteFollowUp(activeField.id, opt)}
                                  className="text-xs text-destructive hover:underline">Eliminar seguimiento</button>
                              </div>
                            ) : (
                              <button onClick={() => addFollowUp(activeField.id, opt)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                + Pregunta de seguimiento
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="rounded-xl"
                      onClick={() => addOption(activeField.id)}>
                      <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" /> Agregar opción
                    </Button>
                  </div>
                )}

                {activeField.type === 'rating' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Etiquetas de la escala (1-5)</label>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground">Mínimo (1)</p>
                        <Input value={activeField.ratingMin} onChange={e => updateField(activeField.id, { ratingMin: e.target.value })}
                          placeholder="Nada" className="rounded-xl" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-muted-foreground">Máximo (5)</p>
                        <Input value={activeField.ratingMax} onChange={e => updateField(activeField.id, { ratingMax: e.target.value })}
                          placeholder="Mucho" className="rounded-xl" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
