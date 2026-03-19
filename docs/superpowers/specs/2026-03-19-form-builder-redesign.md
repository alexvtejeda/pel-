# Form Builder Redesign — Design Spec (2026-03-19)

Redesign the form builder UI from a two-panel layout to a Google Forms-style stacked card layout. Extract a shared `FormBuilder` component used by both admin and RC dashboards.

---

## 1. Shared FormBuilder Component

### Problem

`admin-form-tab.tsx` (~360 lines) and `forms-tab.tsx` duplicate nearly identical form builder code — same field types, same editing UI, same drag-and-drop logic, same follow-up management.

### Design

Create `components/forms/form-builder.tsx` — a shared component that both tabs import.

**Props interface:**

```tsx
interface FormBuilderProps {
  fields: FormField[]
  onChange: (fields: FormField[]) => void
  formName?: string
  onNameChange?: (name: string) => void
}
```

**FormBuilder owns:**
- Stacked card layout rendering
- Field selection and inline editing
- Drag-and-drop reorder
- Right-side toolbar for adding fields and section dividers
- Section grouping logic (visual grouping by `field.section` string)
- Follow-up management (add/edit/delete conditional questions)

**Parent tabs own:**
- Loading/saving via their respective APIs
- Edit/Preview toggle
- Save button + dirty state
- Form selection (RC tab has multiple forms)
- Error/loading states

**Shared utilities** moved into `form-builder.tsx`:
- `FIELD_TYPES` array
- `HAS_OPTIONS` array
- `typeInfo()` helper
- `makeField()` factory
- All field CRUD helpers (add, update, delete, addOption, updateOption, deleteOption)
- Follow-up helpers (addFollowUp, deleteFollowUp, updateFollowUpField)
- Drag-and-drop handlers

**No API or data model changes.** `FormField`, `FieldType`, `Form` types stay exactly as they are.

---

## 2. Card Layout & Interaction

### Title Card (always first, not deletable, not draggable)

- `border-top: 4px solid pop-550` accent
- Form name as a large editable input
- Controlled via `formName`/`onNameChange` props
- No description field (the `Form` type has no description property)

### Selected Card (click a card to select it)

- Left accent bar: `border-left: 4px solid pop-550`
- Border highlights: `border-pop-550`
- Question label becomes an editable input with bottom underline
- Type selector dropdown appears top-right (select element with all field types)
- Options become editable inputs with visual indicators:
  - `multiple_choice`: radio circle indicators
  - `checkbox`: square checkbox indicators
  - `dropdown`: numbered list indicators
- Each option has a delete (×) button
- `+ Agregar opción` link at bottom of options list
- `+ Pregunta de seguimiento` text link below each option (for `multiple_choice`/`dropdown` types only, when option text is non-empty)
- Follow-up sub-fields render indented (`ml-6`) below their parent option as mini-cards
- Bottom toolbar (separated by `border-top`):
  - Required toggle switch (label: "Requerido")
  - Divider line
  - Duplicate button (`faCopy` icon) — creates a deep copy of the field (including options and follow-ups) with a new UUID, inserted directly below the original
  - Delete button (`faTrash` icon, destructive color)
- Drag handle (`faGripVertical`) always visible on selected card
- Selected card is draggable

**Changing field type** via the type selector dropdown:
- If changing from a type in `HAS_OPTIONS` to one that isn't: clear `options` array
- If changing from `multiple_choice`/`dropdown` to any other type: clear `follow_ups` array
- Other properties (label, description, section, required) are preserved

**Why `checkbox` doesn't support follow-ups:** Checkboxes allow multiple selections, making `when_answer` matching ambiguous (which combination triggers the follow-up?). Only `multiple_choice` and `dropdown` have single-answer semantics.

### Collapsed Card (non-selected)

- Read-only preview: question label + required asterisk
- Content hint below label:
  - `multiple_choice`/`checkbox`: list options with radio/checkbox indicators
  - `dropdown`: list options with numbered indicators
  - `short_text`: single-line underline with "Texto corto" placeholder
  - `long_text`: multi-line underline with "Texto largo" placeholder
  - `date`: "Fecha" placeholder
  - `rating`: star scale hint
  - `file_upload`: "Archivo" placeholder
- Drag handle (`faGripVertical`) appears on hover
- Click anywhere to select (deselects previously selected card)
- `rounded-2xl` border, `bg-card`, `border-border`

---

## 3. Right-Side Toolbar & Sections

### Floating Toolbar

- Sticky column to the right of the card stack
- One icon button per field type (8 total), using Font Awesome icons:
  - `faAlignLeft` — Texto corto
  - `faAlignJustify` — Texto largo
  - `faListCheck` — Selección múltiple
  - `faSquareCheck` — Casillas
  - `faSort` — Desplegable
  - `faCalendar` — Fecha
  - `faStar` — Escala
  - `faFile` — Archivo
- Horizontal divider line
- Section divider button at bottom (`faGripLines` or similar)
- `rounded-2xl` container, `bg-card`, `border-border`
- Each button: `rounded-xl`, tooltip on hover showing type name
- Clicking an icon inserts a new field of that type **below the currently selected card** (or at the end if none selected)

### Section Grouping (hybrid approach)

Uses the existing `section` string on `FormField` — no data model changes.

**Section tab pill:** Renders above the first card of each section group:
- Format: "Sección N de M — {section name}"
- Styled as a pill: `bg-pop-550 text-white text-xs font-semibold px-4 py-1.5 rounded-xl rounded-b-none w-fit`

**Adding a section divider:**
- Click the section divider button in the toolbar
- An inline input appears at the insertion point for the section name
- All subsequent fields below that point get their `section` string set to the new name
- If the input is left empty or cancelled, no section is created

**Drag between sections:**
- Moving a field via drag-and-drop into a different section group updates its `section` value to match the destination group

**Deleting a section:**
- Clicking the section tab pill shows a delete (×) button
- Deleting a section merges its fields into the previous section (sets their `section` to the previous section's name, or clears to empty string if it was the first section)
- Deleting all fields in a section also removes the section header

**Fields with no section:**
- Fields with empty/null `section` string belong to an implicit first group with no section tab pill
- The first section tab pill only appears when a named section begins

### Mobile (below `md:` breakpoint)

The right-side toolbar collapses into a `+` floating action button (bottom-right, `rounded-full`, `bg-pop-550`) that opens a shadcn `DropdownMenu` with all field type options + section divider. Same icons and labels as the desktop toolbar.

---

## 4. Integration with Parent Tabs

### `admin-form-tab.tsx` (slimmed down)

Retains:
- `loadTemplate()` / `handleSave()` with `adminApi` calls
- `formName` / `fields` / `dirty` / `loading` / `loadError` state
- Edit/Preview toggle
- Save button
- Error state UI with retry

Renders:
```tsx
{view === 'edit' && (
  <FormBuilder
    fields={fields}
    onChange={newFields => { setFields(newFields); setDirty(true) }}
    formName={formName}
    onNameChange={name => { setFormName(name); setDirty(true) }}
  />
)}
{view === 'preview' && (
  <FormRenderer form={...} rc={...} />
)}
```

### `forms-tab.tsx` (RC dashboard, slimmed down)

Retains:
- Form list selector (standard vs special needs)
- `listForms()` / `getForm()` / `updateForm()` / `createForm()` API calls
- Logo upload
- Edit/Preview toggle
- Save button

Renders the same `<FormBuilder>` and `<FormRenderer>` pattern.

### Code eliminated from both tabs

All of the following moves into `form-builder.tsx`:
- `FIELD_TYPES`, `HAS_OPTIONS`, `typeInfo()`, `makeField()`
- `updateField`, `addField`, `deleteField`
- `addOption`, `updateOption`, `deleteOption`
- `addFollowUp`, `deleteFollowUp`, `updateFollowUpField`
- `handleDragStart`, `handleDragOver`, `handleDrop`
- `activeFieldId` state and selection logic
- The entire field list + field editor UI

---

## 5. Design System Compliance

- **Cards**: `rounded-2xl` (per geometry rules)
- **Buttons**: `rounded-xl`
- **Icons**: Font Awesome only, sized with `text-*` classes
- **Colors**: `pop-550` for accent, `bg-card` for card backgrounds, `border-border` for inactive borders
- **Typography**: Inter/Source Sans 3/Manrope
- **Dark theme**: all cards use dark backgrounds matching existing dashboard styling

---

## Files Changed

- **Create**: `components/forms/form-builder.tsx` — shared form builder component
- **Modify**: `components/dashboard/admin/admin-form-tab.tsx` — replace inline builder with `<FormBuilder>`
- **Modify**: `components/dashboard/rescue-center/forms-tab.tsx` — replace inline builder with `<FormBuilder>`

## Not Changed

- `components/forms/form-renderer.tsx` — stays as-is
- `lib/api/forms.ts` — no type or API changes
- `lib/api/admin.ts` — no API changes
