# Adoption Flow Spec (Frontend)

> **Depends on:** adoption-forms-backend, adoption-forms-builder (FormRenderer component)
> **Route:** `/adopt/[pet-id]`

## Summary

The member fill experience: a dedicated full-page form at `/adopt/[pet-id]` with the rescue center's branding, the resolved form for that pet, and file upload support. After submission, the RC reviews it in the Interesados tab and approves or rejects it. Approval opens a chat thread.

---

## Member Fill Page — `/adopt/[pet-id]`

### Route file

```typescript
// app/adopt/[pet-id]/page.tsx
'use client'
```

Static export constraint: client-side fetch only (same pattern as `/p/[slug]`).

On mount:
1. `GET /api/v1/pets/:id/form` — resolves the correct form + RC branding (`{ form, rc, advisory }`)
2. `GET /api/v1/pets/:id` — fetch pet details (name, photos, species, conditions)
3. If pet not found → redirect to `/pets`
4. Render the page

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  [RC logo — 1600×400, sticky, object-fit: cover]        │  ← position: sticky, top: 0, z-index: 10
│  fallback: gradient banner with RC name centered        │
└─────────────────────────────────────────────────────────┘

  ← Back to [pet name]         ← link back to /pets (with pet pre-selected)

  ┌──────────────────────────────────────────────────┐
  │  [pet photo thumbnail 48×48]  Luna               │  ← pet context chip
  │  Centro de Rescate XYZ  ·  📍 Santo Domingo      │
  └──────────────────────────────────────────────────┘

  Formulario de Adopción
  [form description from RC if any — future field]

  ── Datos Personales ──────────────────────────────
  [fields...]

  ── Información Complementaria ────────────────────
  [fields...]

  ── Compromisos ───────────────────────────────────
  [fields...]

                              [Enviar solicitud →]
```

Max width: `max-w-2xl mx-auto px-4 py-8`.

### Sticky logo banner

```tsx
<div className="sticky top-0 z-10 w-full aspect-[4/1] overflow-hidden">
  {rc.logo_url
    ? <img src={rc.logo_url} className="w-full h-full object-cover" />
    : <div className="w-full h-full bg-gradient-to-r from-pop-500 to-pop-550 flex items-center justify-center">
        <span className="text-white text-2xl font-bold">{rc.name}</span>
      </div>
  }
</div>
```

### Form rendering — `<FormRenderer />`

Shared component from `components/forms/form-renderer.tsx`. Accepts:

```typescript
interface FormRendererProps {
  form: Form
  rc: { name: string; logo_url: string | null }
  preview?: boolean          // disables submission + file uploads
  initialAnswers?: Answers   // pre-fill from member profile (future)
  onSubmit?: (answers: Answers, files: FileMap) => Promise<void>
}
```

#### Field rendering by type

| Type | Element |
|---|---|
| `short_text` | `<input type="text">` |
| `long_text` | `<textarea rows={4}>` |
| `multiple_choice` | radio group |
| `checkbox` | checkbox group |
| `dropdown` | `<select>` |
| `date` | `<input type="date">` |
| `rating` | 5-button row with min/max labels |
| `file_upload` | file picker, accepts image/pdf, max 10MB |

#### Section headers

When a field has a non-empty `section` and it differs from the previous field's `section`, render a divider:
```tsx
<div className="col-span-full flex items-center gap-3 mt-6 mb-2">
  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section}</span>
  <div className="flex-1 border-t border-border" />
</div>
```

#### Conditional follow-ups

When a `multiple_choice` or `dropdown` answer matches a `follow_up.when_answer`, render the follow-up field immediately below with `ml-6 mt-2 animate-in fade-in`. Animate out on answer change.

#### Required validation

On submit, scroll to the first unanswered required field and highlight it with `ring-2 ring-destructive`. Show an inline error below the field: `"Este campo es obligatorio"`.

#### File upload handling

File upload fields render a drag-and-drop zone:
```
┌─────────────────────────────────┐
│  faArrowUpFromBracket           │
│  Adjuntar archivo               │
│  PNG, JPG, WEBP o PDF · máx 10MB│
└─────────────────────────────────┘
```

Files are uploaded immediately on select via `POST /api/v1/submissions/:id/files`. This requires creating the submission first with empty answers, then uploading files, then finalizing. Implementation detail: create the submission on first file upload, or on final submit (use a `pendingFiles` local state and upload all at once on submit).

**Recommended:** Upload all files on final submit in sequence, then `PATCH` the submission with all file URLs. Simpler state management.

### Submission flow

1. Member clicks `[Enviar solicitud →]`
2. Validate all required fields → highlight errors if any
3. `POST /api/v1/pets/:id/submissions` with `{ form_id, answers }`
4. For each file field with a selected file: `POST /api/v1/submissions/:submission_id/files`
5. On success → show confirmation screen (same card as rescue center wizard success):

```
🐾
¡Solicitud enviada!
Tu solicitud para adoptar a Luna ha sido enviada.
El centro revisará tu información y te notificará pronto.

Estado: Pendiente de revisión

[Volver a mascotas]
```

6. On error → show inline error at bottom: `animate-wiggle` wrapper, same style as onboarding wizards.

### `generateStaticParams`

Not used — dynamic pet IDs unknown at build time. Client-side fetch only (same as `/p/[slug]`).

---

## RC Submission Review — Interesados Tab

### Current state

`interested-tab.tsx` likely shows a placeholder. Replace with the full submission review UI.

### Layout

```
Interesados                           [Todas ▼]  ← status filter

┌─────────────────────────────────────────────────────┐
│  [pet photo 40×40]  Luna  ·  Formulario estándar    │
│  María García  ·  Hace 2 días        [Pendiente]    │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  [pet photo 40×40]  Thor  ·  Formulario estándar    │
│  Carlos Díaz  ·  Hace 1 semana       [Aprobado]     │
└─────────────────────────────────────────────────────┘
```

- Status filter dropdown: Todas, Pendiente, Aprobado, Rechazado
- Each row is a card (`rounded-2xl`) — clickable to open detail view
- Status pill colors:
  - `pending`: amber (`bg-amber-100 text-amber-700`)
  - `approved`: green (`bg-green-100 text-green-700`)
  - `rejected`: red (`bg-destructive/10 text-destructive`)

### Submission detail view

Click a submission row → slide in a full detail panel (or navigate to a sub-view within the tab using a local `selectedId` state — no new route needed):

```
← Volver          Luna  ·  María García  ·  [Pendiente]

── Datos Personales ─────────────────────────────────
Nombre              María García
Edad                28
Estado civil        Casada/o
...

── Información Complementaria ───────────────────────
¿Está tu hogar preparado...?
"Es un apartamento, no hay forma de escaparse."
...

── Compromisos ──────────────────────────────────────
¿Estás consciente de que podemos retirar...?
Sí, estoy consciente
...

── Archivos adjuntos ────────────────────────────────
[image thumbnail] [image thumbnail]   ← inline previews, click to expand

─────────────────────────────────────────────────────
[Rechazar]                      [Aprobar solicitud →]
```

Each question-answer pair renders as:
```tsx
<div className="space-y-1">
  <p className="text-xs text-muted-foreground">{field.label}</p>
  <p className="text-sm">{answer}</p>
</div>
```

File answers render as `<img>` thumbnails (64×64, `object-cover rounded-lg cursor-pointer`). Clicking opens a full-screen lightbox (simple: fixed overlay with the image + × button).

### Approve action

Button: `[Aprobar solicitud →]` — `bg-pop-550 text-white rounded-xl px-6 py-2.5`

On click:
1. `PATCH /api/v1/submissions/:id` with `{ status: 'approved' }`
2. Backend creates chat thread + sends notification
3. UI: status pill changes to Aprobado, action buttons replaced with `"Chat iniciado ✓"`

### Reject action

Button: `[Rechazar]` — `rounded-xl border border-destructive/30 text-destructive px-6 py-2.5`

On click: expand an inline textarea:
```
Motivo del rechazo (opcional)
[textarea, 2 rows]
             [Confirmar rechazo]
```

On confirm:
1. `PATCH /api/v1/submissions/:id` with `{ status: 'rejected', rejection_note }`
2. Backend sends rejection notification to member
3. UI: status pill changes to Rechazado

---

## API module: `lib/api/submissions.ts`

```typescript
export interface Submission {
  id: string
  form_id: string
  pet_id: string
  member_id: string
  answers: Record<string, string | string[]>
  status: 'pending' | 'approved' | 'rejected'
  rejection_note: string | null
  submitted_at: string
  reviewed_at: string | null
  // joined fields for list view:
  pet_name?: string
  pet_photo_url?: string
  member_name?: string
}

export async function submitAdoptionForm(
  petId: string,
  input: { form_id: string; answers: Record<string, string | string[]> }
): Promise<{ data: { submission_id: string } | null; error: string | null }>

export async function uploadSubmissionFile(
  submissionId: string,
  fieldId: string,
  file: File
): Promise<{ data: { url: string } | null; error: string | null }>

export async function listSubmissions(
  formId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<{ data: Submission[] | null; error: string | null }>

export async function getSubmission(
  id: string
): Promise<{ data: Submission | null; error: string | null }>

export async function reviewSubmission(
  id: string,
  input: { status: 'approved' | 'rejected'; rejection_note?: string }
): Promise<{ data: Submission | null; error: string | null }>
```

`uploadSubmissionFile` uses raw `fetch` with `getStoredAccessToken()` — same multipart pattern as pet photo uploads.

---

## New Files

| File | Purpose |
|---|---|
| `app/adopt/[pet-id]/page.tsx` | Member fill route (client component) |
| `components/forms/form-renderer.tsx` | Shared form rendering — used by fill page and builder preview |
| `lib/api/submissions.ts` | Submission API module |

---

## Verification

- `bun run lint` — no errors
- Clicking "Adoptar a Luna →" on pets page navigates to `/adopt/[luna-id]` ✓
- Sticky RC logo banner visible while scrolling ✓
- Required field validation highlights unfilled fields on submit ✓
- Conditional follow-up appears/disappears as radio answer changes ✓
- File upload field accepts image/PDF ✓
- Successful submit shows pending confirmation screen ✓
- Invalid pet ID redirects to `/pets` ✓
- Interesados tab shows submission list with status pills ✓
- Clicking a submission opens the detail view with all answers ✓
- File attachments show as inline image thumbnails ✓
- Approve action changes status and shows "Chat iniciado ✓" ✓
- Reject action expands textarea, submits with optional note ✓
- RC notification appears in notifications tab after new submission ✓
- Member notification appears after approval/rejection ✓
