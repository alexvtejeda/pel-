# Form Builder Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-panel form builder with a Google Forms-style stacked card layout, extracted into a shared `FormBuilder` component.

**Architecture:** A single new `FormBuilder` component (`components/forms/form-builder.tsx`) encapsulates all field editing UI — stacked cards, inline editing, drag-and-drop, right-side toolbar, section grouping, and follow-up management. Both `admin-form-tab.tsx` and `forms-tab.tsx` are slimmed to only handle API persistence and rendering `<FormBuilder>` + `<FormRenderer>`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Font Awesome, shadcn/ui (Input, Button, DropdownMenu)

**Spec:** `docs/superpowers/specs/2026-03-19-form-builder-redesign.md`

---

## Chunk 1: Build the FormBuilder Component

### Task 1: Create the shared FormBuilder component

This is the core task. Build the complete Google Forms-style form builder as a new file.

**Files:**
- Create: `components/forms/form-builder.tsx`

**Key reference files (read before implementing):**
- `lib/api/forms.ts` — `FormField`, `FieldType`, `FollowUp` type definitions
- `components/dashboard/admin/admin-form-tab.tsx` — current admin builder (source of all helper functions to extract)
- `components/forms/form-renderer.tsx` — for collapsed card content hints (see how each field type renders)

- [ ] **Step 1: Create the file with exports, types, constants, and helpers**

Create `components/forms/form-builder.tsx` with the following foundation:

```tsx
'use client'

import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAlignLeft, faAlignJustify, faListCheck, faSquareCheck,
  faSort, faCalendar, faStar, faFile, faTrash, faPlus,
  faGripVertical, faCopy, faGripLines,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FieldType } from '@/lib/api/forms'

// --- Types ---

type FieldTypeDef = { type: FieldType; label: string; icon: IconDefinition }

export interface FormBuilderProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
  formName?: string
  onNameChange?: (name: string) => void
}

// --- Constants ---

const FIELD_TYPES: FieldTypeDef[] = [
  { type: 'short_text',      label: 'Texto corto',       icon: faAlignLeft },
  { type: 'long_text',       label: 'Texto largo',       icon: faAlignJustify },
  { type: 'multiple_choice', label: 'Selección múltiple', icon: faListCheck },
  { type: 'checkbox',        label: 'Casillas',          icon: faSquareCheck },
  { type: 'dropdown',        label: 'Desplegable',       icon: faSort },
  { type: 'date',            label: 'Fecha',             icon: faCalendar },
  { type: 'rating',          label: 'Escala',            icon: faStar },
  { type: 'file_upload',     label: 'Archivo',           icon: faFile },
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
```

- [ ] **Step 2: Implement the FormBuilder component with all internal state and helpers**

Continue in the same file. The component manages `activeFieldId` internally and calls `props.onChange` whenever fields change:

```tsx
export function FormBuilder({ fields, onChange, formName, onNameChange }: FormBuilderProps) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const dragIndexRef = useRef<number | null>(null)

  const activeField = fields.find(f => f.id === activeFieldId) ?? null

  // --- Field CRUD helpers (all call onChange) ---

  const updateField = (id: string, changes: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...changes } : f))
  }

  const addFieldOfType = (type: FieldType) => {
    const f = makeField(type)
    // Insert below selected card, or at end
    const idx = activeFieldId ? fields.findIndex(fi => fi.id === activeFieldId) : -1
    const next = [...fields]
    next.splice(idx >= 0 ? idx + 1 : next.length, 0, f)
    onChange(next)
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
    const field = fields.find(f => f.id === id)
    if (!field) return
    const changes: Partial<FormField> = { type: newType }
    if (!HAS_OPTIONS.includes(newType)) {
      changes.options = []
      changes.follow_ups = []
    } else if (newType !== 'multiple_choice' && newType !== 'dropdown') {
      changes.follow_ups = []
    }
    if (HAS_OPTIONS.includes(newType) && field.options.length === 0) {
      changes.options = ['']
    }
    updateField(id, changes)
  }

  // --- Option helpers ---

  const addOption = (id: string) =>
    updateField(id, { options: [...(fields.find(f => f.id === id)?.options ?? []), ''] })
  const updateOption = (id: string, i: number, val: string) =>
    updateField(id, { options: fields.find(f => f.id === id)!.options.map((o, j) => j === i ? val : o) })
  const deleteOption = (id: string, i: number) =>
    updateField(id, { options: fields.find(f => f.id === id)!.options.filter((_, j) => j !== i) })

  // --- Follow-up helpers ---

  const addFollowUp = (fieldId: string, whenAnswer: string) => {
    const sub = { ...makeField('short_text'), follow_ups: [] as never[] }
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

  // --- Drag-and-drop ---

  const handleDragStart = (i: number) => { dragIndexRef.current = i }
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndexRef.current === null || dragIndexRef.current === i) return
    const next = [...fields]
    const [moved] = next.splice(dragIndexRef.current!, 1)
    next.splice(i, 0, moved)
    dragIndexRef.current = i
    // Update section to match destination group
    const prevField = i > 0 ? next[i - 1] : null
    if (prevField && moved.section !== prevField.section) {
      next[i] = { ...next[i], section: prevField.section }
    }
    onChange(next)
  }
  const handleDrop = () => { dragIndexRef.current = null }

  // --- Section helpers ---

  const addSectionDivider = () => {
    const name = window.prompt('Nombre de la sección:')
    if (!name?.trim()) return
    // Find insertion point (below selected or at end)
    const idx = activeFieldId ? fields.findIndex(f => f.id === activeFieldId) : -1
    const insertAt = idx >= 0 ? idx + 1 : fields.length
    // Set section on all subsequent fields that don't already have a different section
    const next = [...fields]
    for (let i = insertAt; i < next.length; i++) {
      // Stop if we hit a field that already starts a different section
      if (i > insertAt && next[i].section && next[i].section !== next[insertAt - 1]?.section) break
      next[i] = { ...next[i], section: name.trim() }
    }
    onChange(next)
  }

  const deleteSection = (sectionName: string) => {
    // Find the section that comes before this one
    let prevSection = ''
    for (const f of fields) {
      if (f.section === sectionName) break
      prevSection = f.section
    }
    onChange(fields.map(f => f.section === sectionName ? { ...f, section: prevSection } : f))
  }

  // --- Compute section groups for rendering ---

  const sectionGroups: { name: string; fields: { field: FormField; index: number }[] }[] = []
  let currentSection = ''
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]
    if (f.section !== currentSection || sectionGroups.length === 0) {
      currentSection = f.section
      sectionGroups.push({ name: currentSection, fields: [] })
    }
    sectionGroups[sectionGroups.length - 1].fields.push({ field: f, index: i })
  }
  const namedSectionCount = sectionGroups.filter(g => g.name).length

  // ... render method follows in Step 3
```

- [ ] **Step 3: Implement the render method — title card, section groups, field cards, and toolbar**

Complete the component's return JSX. This is the largest piece. The layout is:

```
<div className="flex gap-3 items-start">
  <!-- Main column (max-w-2xl mx-auto) -->
  <div className="flex-1 max-w-2xl mx-auto flex flex-col gap-3">
    <!-- Title card -->
    <!-- For each section group: section tab pill + field cards -->
  </div>
  <!-- Right toolbar (sticky, hidden on mobile) -->
  <div className="hidden md:flex ...">
  <!-- Mobile FAB (visible on mobile only) -->
</div>
```

**Title card:**
```tsx
{(formName !== undefined || onNameChange) && (
  <div className="rounded-2xl border border-border bg-card p-5 border-t-4 border-t-pop-550">
    <input
      type="text"
      value={formName ?? ''}
      onChange={e => onNameChange?.(e.target.value)}
      placeholder="Nombre del formulario"
      className="w-full bg-transparent text-xl font-bold text-foreground border-none border-b-2 border-b-pop-550 pb-2 outline-none placeholder:text-muted-foreground/50"
    />
  </div>
)}
```

**Section tab pill** (rendered above first card of each named section):
```tsx
{group.name && (
  <div className="flex items-center gap-2">
    <span className="bg-pop-550 text-white text-xs font-semibold px-4 py-1.5 rounded-xl rounded-b-none">
      Sección {sectionIdx} de {namedSectionCount} — {group.name}
    </span>
    <button onClick={() => deleteSection(group.name)}
      className="text-xs text-muted-foreground hover:text-destructive">✕</button>
  </div>
)}
```

**Collapsed card** (when `field.id !== activeFieldId`):
```tsx
<div
  key={field.id}
  draggable
  onDragStart={() => handleDragStart(index)}
  onDragOver={e => handleDragOver(e, index)}
  onDrop={handleDrop}
  onClick={() => setActiveFieldId(field.id)}
  className="rounded-2xl border border-border bg-card p-5 cursor-pointer hover:border-muted-foreground/30 transition-colors group"
>
  <div className="flex items-start gap-2">
    <FontAwesomeIcon icon={faGripVertical}
      className="text-xs text-muted-foreground/30 group-hover:text-muted-foreground mt-1 cursor-grab shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">
        {field.label || <span className="text-muted-foreground italic">Sin título</span>}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </p>
      {/* Content hint by type */}
      <div className="mt-2 text-xs text-muted-foreground">
        {/* Render options for multiple_choice/checkbox/dropdown */}
        {/* Render placeholder hints for text/date/rating/file_upload */}
      </div>
    </div>
  </div>
</div>
```

Content hints for collapsed cards:
- `multiple_choice`: radio circles + option text
- `checkbox`: square indicators + option text
- `dropdown`: numbered list + option text
- `short_text`: single-line border-bottom with "Texto corto"
- `long_text`: multi-line border-bottom with "Texto largo"
- `date`: "Fecha" text
- `rating`: "Escala 1-5" text with ratingMin/ratingMax labels
- `file_upload`: "Archivo" text

**Selected card** (when `field.id === activeFieldId`):
```tsx
<div
  key={field.id}
  draggable
  onDragStart={() => handleDragStart(index)}
  onDragOver={e => handleDragOver(e, index)}
  onDrop={handleDrop}
  className="rounded-2xl border-2 border-pop-550 bg-card p-5 relative"
  style={{ borderLeftWidth: '4px' }}
>
  {/* Top row: label input + type selector */}
  <div className="flex items-start gap-3 mb-4">
    <FontAwesomeIcon icon={faGripVertical}
      className="text-xs text-muted-foreground mt-2 cursor-grab shrink-0" />
    <div className="flex-1">
      <input type="text" value={field.label}
        onChange={e => updateField(field.id, { label: e.target.value })}
        placeholder="Pregunta sin título"
        className="w-full bg-transparent text-base font-semibold border-none border-b-2 border-b-pop-550 pb-1 outline-none text-foreground placeholder:text-muted-foreground/50" />
    </div>
    <select value={field.type}
      onChange={e => changeFieldType(field.id, e.target.value as FieldType)}
      className="px-3 py-1.5 rounded-xl border border-input bg-background text-xs text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shrink-0">
      {FIELD_TYPES.map(ft => <option key={ft.type} value={ft.type}>{ft.label}</option>)}
    </select>
  </div>

  {/* Description (optional) */}
  <input type="text" value={field.description}
    onChange={e => updateField(field.id, { description: e.target.value })}
    placeholder="Descripción (opcional)"
    className="w-full bg-transparent text-sm border-none border-b border-b-border pb-1 mb-4 outline-none text-muted-foreground placeholder:text-muted-foreground/30" />

  {/* Section input */}
  <input type="text" value={field.section}
    onChange={e => updateField(field.id, { section: e.target.value })}
    placeholder="Sección (opcional)"
    className="w-full bg-transparent text-xs border-none border-b border-b-border pb-1 mb-4 outline-none text-muted-foreground placeholder:text-muted-foreground/30" />

  {/* Options (for multiple_choice/checkbox/dropdown) */}
  {HAS_OPTIONS.includes(field.type) && (
    <div className="flex flex-col gap-2 ml-1">
      {field.options.map((opt, idx) => (
        <div key={idx}>
          <div className="flex items-center gap-2">
            {/* Visual indicator: radio, checkbox, or number */}
            {field.type === 'multiple_choice' && (
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            {field.type === 'checkbox' && (
              <div className="w-4 h-4 rounded-sm border-2 border-muted-foreground/30 shrink-0" />
            )}
            {field.type === 'dropdown' && (
              <span className="text-xs text-muted-foreground shrink-0 w-4 text-center">{idx + 1}.</span>
            )}
            <input type="text" value={opt}
              onChange={e => updateOption(field.id, idx, e.target.value)}
              placeholder={`Opción ${idx + 1}`}
              className="flex-1 bg-transparent text-sm border-none border-b border-b-border pb-1 outline-none text-foreground placeholder:text-muted-foreground/30" />
            <button onClick={() => deleteOption(field.id, idx)}
              disabled={field.options.length <= 1}
              className="text-muted-foreground/40 hover:text-destructive text-sm disabled:opacity-30 shrink-0">
              <FontAwesomeIcon icon={faTrash} className="text-xs" />
            </button>
          </div>
          {/* Follow-up link for multiple_choice/dropdown */}
          {(field.type === 'multiple_choice' || field.type === 'dropdown') && opt.trim() && (
            <div className="ml-6 mt-1">
              {field.follow_ups?.find(fu => fu.when_answer === opt) ? (
                <div className="p-3 rounded-xl border border-dashed border-muted bg-muted/20 space-y-2 mt-1">
                  <p className="text-xs text-muted-foreground">Cuando &ldquo;{opt}&rdquo;:</p>
                  <Input
                    value={field.follow_ups.find(fu => fu.when_answer === opt)!.field.label}
                    onChange={e => updateFollowUpField(field.id, opt, { label: e.target.value })}
                    placeholder="Pregunta de seguimiento" className="rounded-xl text-xs" />
                  <button onClick={() => deleteFollowUp(field.id, opt)}
                    className="text-xs text-destructive hover:underline">Eliminar seguimiento</button>
                </div>
              ) : (
                <button onClick={() => addFollowUp(field.id, opt)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  + Pregunta de seguimiento
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <button onClick={() => addOption(field.id)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-6 mt-1">
        + Agregar opción
      </button>
    </div>
  )}

  {/* Rating fields */}
  {field.type === 'rating' && (
    <div className="flex gap-3 mt-2">
      <div className="flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">Mínimo (1)</p>
        <Input value={field.ratingMin} onChange={e => updateField(field.id, { ratingMin: e.target.value })}
          placeholder="Nada" className="rounded-xl" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">Máximo (5)</p>
        <Input value={field.ratingMax} onChange={e => updateField(field.id, { ratingMax: e.target.value })}
          placeholder="Mucho" className="rounded-xl" />
      </div>
    </div>
  )}

  {/* Bottom toolbar */}
  <div className="flex justify-end items-center gap-3 mt-4 pt-3 border-t border-border">
    <span className="text-xs text-muted-foreground">Requerido</span>
    <button onClick={() => updateField(field.id, { required: !field.required })}
      className={`w-9 h-5 rounded-full transition-colors relative ${field.required ? 'bg-pop-550' : 'bg-muted'}`}>
      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${field.required ? 'right-0.5' : 'left-0.5'}`} />
    </button>
    <div className="w-px h-5 bg-border" />
    <button onClick={() => duplicateField(field.id)} title="Duplicar"
      className="text-muted-foreground hover:text-foreground">
      <FontAwesomeIcon icon={faCopy} className="text-sm" />
    </button>
    <button onClick={() => deleteField(field.id)} title="Eliminar"
      className="text-destructive hover:text-destructive/80">
      <FontAwesomeIcon icon={faTrash} className="text-sm" />
    </button>
  </div>
</div>
```

**Right-side toolbar** (desktop, sticky):
```tsx
<div className="hidden md:flex flex-col gap-1.5 sticky top-4 rounded-2xl border border-border bg-card p-2">
  {FIELD_TYPES.map(ft => (
    <button key={ft.type} onClick={() => addFieldOfType(ft.type)} title={ft.label}
      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      <FontAwesomeIcon icon={ft.icon} className="text-sm" />
    </button>
  ))}
  <div className="h-px bg-border my-1" />
  <button onClick={addSectionDivider} title="Nueva sección"
    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
    <FontAwesomeIcon icon={faGripLines} className="text-sm" />
  </button>
</div>
```

**Mobile FAB** (below `md:` breakpoint):
```tsx
<div className="md:hidden fixed bottom-6 right-6 z-20">
  {/* Use shadcn DropdownMenu with a + button trigger */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="w-14 h-14 rounded-full bg-pop-550 text-white flex items-center justify-center shadow-lg">
        <FontAwesomeIcon icon={faPlus} className="text-xl" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {FIELD_TYPES.map(ft => (
        <DropdownMenuItem key={ft.type} onClick={() => addFieldOfType(ft.type)}>
          <FontAwesomeIcon icon={ft.icon} className="text-sm" /> {ft.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={addSectionDivider}>
        <FontAwesomeIcon icon={faGripLines} className="text-sm" /> Nueva sección
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Add the shadcn DropdownMenu imports at the top of the file:
```tsx
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

**Empty state** (when fields.length === 0 and no title card):
```tsx
{fields.length === 0 && (
  <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
    Agrega un campo para empezar
  </div>
)}
```

- [ ] **Step 4: Verify the component compiles**

Run: `npx tsc --noEmit 2>&1 | grep form-builder`
Expected: No errors in `form-builder.tsx`

- [ ] **Step 5: Commit**

```bash
git add components/forms/form-builder.tsx
git commit -m "feat: create shared FormBuilder component with Google Forms-style UI"
```

---

## Chunk 2: Wire into Parent Tabs

### Task 2: Replace admin-form-tab.tsx builder with FormBuilder

**Files:**
- Modify: `components/dashboard/admin/admin-form-tab.tsx`

- [ ] **Step 1: Rewrite admin-form-tab.tsx**

Strip all builder code and replace with `<FormBuilder>`. The file should shrink from ~360 lines to ~100 lines. Keep:
- `loadTemplate()` / `handleSave()` with `adminApi` calls
- `formName` / `fields` / `dirty` / `loading` / `loadError` state
- Edit/Preview toggle + Save button
- Error state with retry

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/lib/api/forms'
import { FormBuilder } from '@/components/forms/form-builder'
import { FormRenderer } from '@/components/forms/form-renderer'
import * as adminApi from '@/lib/api/admin'

export function AdminFormTab() {
  const [fields, setFields]       = useState<FormField[]>([])
  const [formName, setFormName]   = useState('Plantilla de adopción')
  const [view, setView]           = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saveMsg, setSaveMsg]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadTemplate = useCallback(() => {
    setLoadError(false)
    setLoading(true)
    adminApi.getFormTemplate().then(({ data, error }) => {
      if (error || !data) {
        setLoadError(true)
      } else {
        setFields(data.fields)
        if (data.name) setFormName(data.name)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => { loadTemplate() }, [loadTemplate])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await adminApi.updateFormTemplate({ name: formName, fields })
    setSaving(false)
    if (error) { setSaveMsg(`Error: ${error}`); return }
    setDirty(false)
    setSaveMsg('Guardado ✓')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-muted-foreground">No se pudo cargar la plantilla. Verifica que el servidor esté disponible.</p>
        <Button size="sm" className="rounded-xl" onClick={loadTemplate}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
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

      {view === 'preview' && (
        <div className="border rounded-2xl overflow-hidden">
          <FormRenderer
            form={{ id: 'preview', rescue_center_id: '', name: formName, is_special_needs: false, fields, created_at: '', updated_at: '' }}
            rc={{ name: 'Pelú Admin', logo_url: null }}
          />
        </div>
      )}

      {view === 'edit' && (
        <FormBuilder
          fields={fields}
          onChange={newFields => { setFields(newFields); setDirty(true) }}
          formName={formName}
          onNameChange={name => { setFormName(name); setDirty(true) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep admin-form-tab`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/admin/admin-form-tab.tsx
git commit -m "refactor: replace admin form builder with shared FormBuilder component"
```

---

### Task 3: Replace forms-tab.tsx builder with FormBuilder

**Files:**
- Modify: `components/dashboard/rescue-center/forms-tab.tsx`

- [ ] **Step 1: Rewrite forms-tab.tsx**

Strip all builder code, keep RC-specific logic (form selector, logo upload, multiple forms). The file should shrink from ~393 lines to ~150 lines.

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Form, FormField, listForms, getForm, createForm, updateForm } from '@/lib/api/forms'
import { LogoUpload } from './logo-upload'
import { FormBuilder } from '@/components/forms/form-builder'
import { FormRenderer } from '@/components/forms/form-renderer'
import { getMyRescueCenter } from '@/lib/api/rescue-centers'

export function FormsTab() {
  const [forms, setForms]               = useState<Form[]>([])
  const [activeFormId, setActiveFormId] = useState<string | null>(null)
  const [fields, setFields]             = useState<FormField[]>([])
  const [view, setView]                 = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty]               = useState(false)
  const [saving, setSaving]             = useState(false)
  const [saveMsg, setSaveMsg]           = useState('')
  const [logoUrl, setLogoUrl]           = useState<string | null>(null)
  const [rcName, setRcName]             = useState('')
  const [loadingForms, setLoadingForms] = useState(true)

  const activeForm = forms.find(f => f.id === activeFormId) ?? null

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

  const switchForm = useCallback(async (formId: string) => {
    if (dirty) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Cambiar de formulario?')) return
    }
    setActiveFormId(formId)
    const { data } = await getForm(formId)
    if (data) { setFields(data.fields); setDirty(false) }
  }, [dirty])

  const handleSave = async () => {
    if (!activeFormId) return
    setSaving(true)
    const { error } = await updateForm(activeFormId, { fields })
    setSaving(false)
    if (error) { setSaveMsg(`Error: ${error}`); return }
    setDirty(false)
    setSaveMsg('Guardado ✓')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const handleCreateForm = async () => {
    const name = window.prompt('Nombre del formulario:')
    if (!name?.trim()) return
    const isSpecial = window.confirm('¿Es un formulario para mascotas con condiciones especiales?')
    const { data, error } = await createForm({ name: name.trim(), is_special_needs: isSpecial })
    if (error || !data) return
    setForms(prev => [...prev, data])
    setActiveFormId(data.id)
    setFields(data.fields)
    setDirty(false)
  }

  if (loadingForms) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-pop-550 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
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
            <option value="__create__">+ Crear formulario</option>
          </select>
          <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-xs" />
        </div>

        <div className="flex gap-1">
          {(['edit', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={v === view
                ? 'px-4 py-1.5 rounded-xl bg-pop-550 text-background text-sm font-medium'
                : 'px-4 py-1.5 rounded-xl text-muted-foreground text-sm hover:bg-muted'}>
              {v === 'edit' ? `Editar${dirty ? ' •' : ''}` : 'Vista previa'}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'Guardando...' : saveMsg || 'Guardar formulario'}
          </Button>
        </div>
      </div>

      {view === 'preview' && activeForm && (
        <div className="border rounded-2xl overflow-hidden">
          <div className="sticky top-0 z-10 w-full max-h-40 overflow-hidden">
            {logoUrl
              ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
              : <div className="w-full h-full bg-linear-to-r from-pop-500 to-pop-550 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{rcName}</span>
                </div>
            }
          </div>
          <FormRenderer
            form={{ ...activeForm, fields }}
            rc={{ name: rcName, logo_url: logoUrl }}
          />
        </div>
      )}

      <LogoUpload logoUrl={logoUrl} onUpdate={url => setLogoUrl(url)} />

      {view === 'edit' && (
        <FormBuilder
          fields={fields}
          onChange={newFields => { setFields(newFields); setDirty(true) }}
          formName={activeForm?.name}
        />
      )}
    </div>
  )
}
```

Note: The RC tab doesn't pass `onNameChange` since form names are set at creation time. The title card will render the name read-only (no onChange handler = display only). If `formName` is undefined, the title card won't render at all.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep forms-tab`
Expected: No errors

- [ ] **Step 3: Test manually**

1. Admin dashboard → Form template tab → should show the new stacked card UI
2. RC dashboard → Forms tab → should show the new stacked card UI
3. Both should still save/load correctly
4. Preview mode should still work with FormRenderer

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/rescue-center/forms-tab.tsx
git commit -m "refactor: replace RC form builder with shared FormBuilder component"
```
