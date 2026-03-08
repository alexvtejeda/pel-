'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAlignLeft,
  faAlignJustify,
  faListCheck,
  faSquareCheck,
  faSort,
  faCalendar,
  faStar,
  faChevronUp,
  faChevronDown,
  faTrash,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FieldType = 'short_text' | 'long_text' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'date' | 'rating'

interface FormField {
  id: string
  type: FieldType
  label: string
  description: string
  required: boolean
  options: string[]
  ratingMin: string
  ratingMax: string
}

const FIELD_TYPES: { type: FieldType; label: string; icon: IconDefinition }[] = [
  { type: 'short_text',      label: 'Texto corto',       icon: faAlignLeft },
  { type: 'long_text',       label: 'Texto largo',        icon: faAlignJustify },
  { type: 'multiple_choice', label: 'Selección múltiple', icon: faListCheck },
  { type: 'checkbox',        label: 'Casillas',           icon: faSquareCheck },
  { type: 'dropdown',        label: 'Desplegable',        icon: faSort },
  { type: 'date',            label: 'Fecha',              icon: faCalendar },
  { type: 'rating',          label: 'Escala',             icon: faStar },
]

function typeInfo(type: FieldType) {
  return FIELD_TYPES.find(f => f.type === type)!
}

const HAS_OPTIONS: FieldType[] = ['multiple_choice', 'checkbox', 'dropdown']

function makeField(type: FieldType): FormField {
  return {
    id: crypto.randomUUID(),
    type,
    label: '',
    description: '',
    required: false,
    options: HAS_OPTIONS.includes(type) ? [''] : [],
    ratingMin: 'Nada',
    ratingMax: 'Mucho',
  }
}

export function FormsTab() {
  const [fields, setFields] = useState<FormField[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newType, setNewType] = useState<FieldType>('short_text')
  const [saved, setSaved] = useState(false)

  const activeField = fields.find(f => f.id === activeId) ?? null

  const addField = () => {
    const field = makeField(newType)
    setFields(prev => [...prev, field])
    setActiveId(field.id)
  }

  const updateField = (id: string, changes: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...changes } : f))
  }

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const moveUp = (i: number) => {
    if (i === 0) return
    setFields(prev => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  }

  const moveDown = (i: number) => {
    setFields(prev => {
      if (i === prev.length - 1) return prev
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      return next
    })
  }

  const addOption = (fieldId: string) => {
    setFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, options: [...f.options, ''] } : f
    ))
  }

  const updateOption = (fieldId: string, idx: number, value: string) => {
    setFields(prev => prev.map(f =>
      f.id === fieldId
        ? { ...f, options: f.options.map((o, i) => i === idx ? value : o) }
        : f
    ))
  }

  const deleteOption = (fieldId: string, idx: number) => {
    setFields(prev => prev.map(f =>
      f.id === fieldId ? { ...f, options: f.options.filter((_, i) => i !== idx) } : f
    ))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Editor de formulario</h2>
        <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={fields.length === 0}>
          {saved ? 'Guardado ✓' : 'Guardar formulario'}
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

        {/* Left panel: field list */}
        <div className="w-full md:w-72 shrink-0 space-y-2">
          {/* Add field row */}
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as FieldType)}
              className="flex-1 px-3 py-2 border border-input rounded-xl text-sm bg-background focus:outline-hidden focus:ring-2 focus:ring-ring"
            >
              {FIELD_TYPES.map(({ type, label }) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
            <Button size="sm" className="rounded-xl shrink-0" onClick={addField}>
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Field cards */}
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-2xl">
              Agrega un campo para empezar
            </p>
          ) : (
            fields.map((field, i) => {
              const { icon } = typeInfo(field.type)
              return (
                <div
                  key={field.id}
                  onClick={() => setActiveId(field.id)}
                  className={`w-full rounded-2xl border bg-card p-3 flex items-center gap-2 text-left transition-colors cursor-pointer ${
                    activeId === field.id ? 'ring-2 ring-ring' : 'hover:bg-muted/50'
                  }`}
                >
                  <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">
                    {field.label
                      ? field.label
                      : <span className="text-muted-foreground italic">Sin título</span>
                    }
                  </span>
                  {field.required && (
                    <span className="text-xs font-bold text-destructive shrink-0">*</span>
                  )}
                  {/* Reorder + delete (stop propagation so clicking doesn't activate the field) */}
                  <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 rounded-lg"
                      disabled={i === 0}
                      onClick={() => moveUp(i)}
                    >
                      <FontAwesomeIcon icon={faChevronUp} className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 rounded-lg"
                      disabled={i === fields.length - 1}
                      onClick={() => moveDown(i)}
                    >
                      <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 rounded-lg text-destructive hover:text-destructive"
                      onClick={() => deleteField(field.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right panel: field editor */}
        <div className="flex-1 min-w-0">
          {activeField === null ? (
            <div className="rounded-2xl border border-dashed flex items-center justify-center py-20 text-sm text-muted-foreground">
              Selecciona un campo para editarlo
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-6 space-y-5">
              {/* Type label */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {(() => {
                  const { icon, label } = typeInfo(activeField.type)
                  return <><FontAwesomeIcon icon={icon} className="w-3 h-3" /><span>{label}</span></>
                })()}
              </div>

              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Etiqueta</label>
                <Input
                  value={activeField.label}
                  onChange={e => updateField(activeField.id, { label: e.target.value })}
                  placeholder="Ej. ¿Tienes otros animales en casa?"
                  className="rounded-xl"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Descripción{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  value={activeField.description}
                  onChange={e => updateField(activeField.id, { description: e.target.value })}
                  placeholder="Ayuda al adoptante a entender la pregunta"
                  className="rounded-xl"
                />
              </div>

              {/* Required toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeField.required}
                  onChange={e => updateField(activeField.id, { required: e.target.checked })}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm">Requerido</span>
              </label>

              {/* Options editor */}
              {HAS_OPTIONS.includes(activeField.type) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Opciones</label>
                  {activeField.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={e => updateOption(activeField.id, idx, e.target.value)}
                        placeholder={`Opción ${idx + 1}`}
                        className="rounded-xl"
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="rounded-xl shrink-0 text-destructive hover:text-destructive"
                        onClick={() => deleteOption(activeField.id, idx)}
                        disabled={activeField.options.length <= 1}
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline" size="sm"
                    className="rounded-xl"
                    onClick={() => addOption(activeField.id)}
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" /> Agregar opción
                  </Button>
                </div>
              )}

              {/* Rating editor */}
              {activeField.type === 'rating' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etiquetas de la escala (1 – 5)</label>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">Mínimo (1)</p>
                      <Input
                        value={activeField.ratingMin}
                        onChange={e => updateField(activeField.id, { ratingMin: e.target.value })}
                        placeholder="Ej. Nada"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">Máximo (5)</p>
                      <Input
                        value={activeField.ratingMax}
                        onChange={e => updateField(activeField.id, { ratingMax: e.target.value })}
                        placeholder="Ej. Mucho"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
