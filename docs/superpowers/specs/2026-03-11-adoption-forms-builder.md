# Adoption Forms — Builder Spec (Frontend)

> **Depends on:** adoption-forms-backend
> **Blocks:** adoption-flow

## Summary

Three frontend changes: (1) pet conditions in Add Pet Modal, (2) RC logo upload in Forms tab and Settings tab, (3) Form builder improvements — drag reorder, follow-up conditionals, Edit/Preview breadcrumb, backend persistence, and default template loading.

---

## 1. Pet Conditions — Add Pet Modal

### UI change

Below the existing fields in `add-pet-modal.tsx`, add a checkbox:

```
☐ Este animal tiene condiciones especiales
```

When checked, expand inline (no page jump, animated height transition):

```
  Movilidad
    ☐ Miembro(s) faltante(s)

  Sensorial
    ☐ Ciego/a
    ☐ Sordo/a

  Médico
    ☐ Enfermedad crónica
    ☐ FIV/FeLV positivo (gatos)

  Conductual
    ☐ Agresividad
    ☐ Trauma
    ☐ Ansiedad / separación

  Alimenticio
    ☐ Manejo dietético / peso

  ─────────────────────────────
  Notas adicionales (opcional)
  [textarea, 2 rows]
```

Multiple conditions can be selected. The outer checkbox acts as a toggle — unchecking it clears all selected conditions without asking for confirmation.

### Condition → DB key mapping

| Checkbox label | `conditions` array value |
|---|---|
| Miembro(s) faltante(s) | `mobility_missing_limb` |
| Ciego/a | `sensory_blind` |
| Sordo/a | `sensory_deaf` |
| Enfermedad crónica | `medical_chronic` |
| FIV/FeLV positivo | `medical_fiv_felv` |
| Agresividad | `behavioral_aggressive` |
| Trauma | `behavioral_trauma` |
| Ansiedad / separación | `behavioral_anxiety` |
| Manejo dietético / peso | `dietary_weight` |

### State additions

```typescript
const [hasConditions, setHasConditions] = useState(false)
const [conditions, setConditions] = useState<string[]>([])
const [conditionNotes, setConditionNotes] = useState('')
```

### API change

Send `conditions` and `condition_notes` in the pet create/update body:
```typescript
await createPet({ ...existingFields, conditions, condition_notes: conditionNotes })
```

### Pet card indicator

In the pets tab list and the pet card, show a small pill if `conditions.length > 0`:
```
🐾 Luna  [Condición especial]
```

Pill style: `text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700` (amber, not destructive — it's informational, not an error).

---

## 2. RC Logo Upload

### Forms tab (primary location)

At the top of the Forms tab edit view, above the field list, render the logo zone:

```
┌─────────────────────────────────────────────────────┐
│  [click or drag to upload — 1600×400]               │
│  aspect-ratio: 4/1  rounded-xl  border-dashed       │
│  If logo_url exists: show <img> with object-fit     │
│  Icon: faImage (text-4xl text-muted-foreground/20)  │
└─────────────────────────────────────────────────────┘
```

- Accepted: PNG, JPG, WEBP, max 5MB
- On upload: `POST /api/v1/rescue-centers/me/logo` (multipart)
- Optimistic update: show local preview immediately, replace with `logo_url` on success
- No explicit save button — uploads immediately on file select

### Settings tab (secondary location)

Add a "Logo del centro" section in `settings-tab.tsx`, using the identical upload component. Same endpoint, same behavior. Changes reflect immediately in the Forms tab since both read from `rescue_centers.logo_url`.

### Shared component

Extract as `components/dashboard/rescue-center/logo-upload.tsx` — accepts no props, reads/writes via the API. Renders identically in both locations.

---

## 3. Form Builder — Improvements

### Edit / Preview breadcrumb

Inside `forms-tab.tsx`, replace the current header with:

```tsx
// Two-tab switcher at the top of the forms tab
<div className="flex gap-2 mb-6">
  <button onClick={() => setView('edit')}  className={view === 'edit'  ? activeTab : inactiveTab}>Editar</button>
  <button onClick={() => setView('preview')} className={view === 'preview' ? activeTab : inactiveTab}>Vista previa</button>
</div>
```

- `activeTab`: `px-4 py-1.5 rounded-xl bg-pop-550 text-white text-sm font-medium`
- `inactiveTab`: `px-4 py-1.5 rounded-xl text-muted-foreground text-sm hover:bg-muted`

### Multiple forms

The forms tab manages two named forms:

```
[Formulario estándar ▼]    ← dropdown to switch between forms
                            Options: "Formulario estándar", "Formulario especial (condiciones)", "+ Crear formulario"
```

State:
```typescript
const [forms, setForms] = useState<Form[]>([])
const [activeFormId, setActiveFormId] = useState<string | null>(null)
```

On mount: `GET /api/v1/forms` → populate list. If empty (shouldn't happen post-approval, but for safety): show "No hay formularios aún" with a create button.

### Drag-to-reorder

Replace the up/down arrow buttons with a drag handle icon (`faGripVertical`) on the left of each field row. Use the HTML5 Drag and Drop API (no external library):

- `draggable` attribute on each field row
- `onDragStart` / `onDragOver` / `onDrop` handlers update the `fields` array
- Visual: dragged item gets `opacity-50`, drop target gets a `border-t-2 border-pop-550` indicator

### Follow-up questions

On `multiple_choice` and `dropdown` fields, each option in the options list has a small link below it:

```
  ○ Sí
      [+ Pregunta de seguimiento]     ← only shown when hovering or editing this option
  ○ No
```

Clicking "+ Pregunta de seguimiento" inserts a new field into `follow_ups` for that answer. In the field list, follow-up questions are rendered indented (24px left margin) and labeled with the triggering answer:

```
  ┌─ ¿Suele amarrar su mascota? *         [⠿] [✕]
  │
  └── cuando "Sí":
      ┌─ ¿Por qué razón?                  [⠿] [✕]
```

Follow-up fields have all the same editing capabilities (label, type, required, options) except they cannot themselves have follow-ups (one level deep only).

### `file_upload` field type

Add `file_upload` to the type dropdown in the field editor. No extra configuration needed — the field simply renders a file picker to the member.

### Backend persistence

On save (`[Guardar formulario]` button):
```typescript
await updateForm(activeFormId, { name: form.name, fields })
```

On mount / form switch: `GET /api/v1/forms/:id` → populate fields state.

Auto-save is NOT implemented — explicit save button only. Show unsaved indicator in tab switcher: `Editar •` (dot) when dirty.

### Preview mode

When `view === 'preview'`, render `<FormRenderer form={activeForm} rc={rc} preview />` — the same component used by members on `/adopt/[pet-id]`, with `preview` prop disabling submission and file uploads. All fields are interactive so the RC can click through conditionals.

The RC logo banner is sticky in preview (same as the member experience).

---

## New Files

| File | Purpose |
|---|---|
| `components/dashboard/rescue-center/logo-upload.tsx` | Shared logo upload zone |
| `components/forms/form-renderer.tsx` | Renders a Form object as interactive UI — used in preview and member fill page |
| `lib/api/forms.ts` | `listForms`, `createForm`, `getForm`, `updateForm`, `deleteForm` |

### `lib/api/forms.ts` shape

```typescript
export interface Form {
  id: string
  rescue_center_id: string
  name: string
  is_special_needs: boolean
  fields: FormField[]
  created_at: string
  updated_at: string
}

export async function listForms(): Promise<{ data: Form[] | null; error: string | null }>
export async function createForm(input: { name: string; is_special_needs: boolean }): Promise<{ data: Form | null; error: string | null }>
export async function getForm(id: string): Promise<{ data: Form | null; error: string | null }>
export async function updateForm(id: string, input: { name?: string; fields?: FormField[] }): Promise<{ data: Form | null; error: string | null }>
export async function deleteForm(id: string): Promise<{ data: null; error: string | null }>
```

All follow the `{ data, error }` pattern.

---

## Verification

- `bun run lint` — no errors
- Add Pet Modal: checking "condición especial" expands the condition checkboxes inline ✓
- Multiple conditions can be selected simultaneously ✓
- Pet with conditions shows amber pill in pets list ✓
- Logo upload in Forms tab and Settings tab both update `logo_url` ✓
- Form builder loads saved form on mount ✓
- Drag handle reorders fields correctly ✓
- Adding a follow-up to "Sí" on a radio question renders indented sub-field ✓
- Switching to Preview shows the full rendered form with sticky logo banner ✓
- Save button persists fields to backend; unsaved dot appears when dirty ✓
- Form dropdown switches between standard and special needs forms ✓
