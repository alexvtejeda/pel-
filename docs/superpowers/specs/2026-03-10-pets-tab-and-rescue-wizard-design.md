# Design Spec: Pets Tab Modal + Rescue Center Wizard Redesign

**Date:** 2026-03-10
**Status:** Approved
**Scope:** Frontend-only changes + minor backend field additions (gender, species on pets)

---

## Sub-project 1 — Add Pet Modal

### Problem
The current pets tab prompts users to upload a photo without explaining that uploading a photo creates a pet. The flow is unintuitive.

### Solution
Replace the upload prompt with a clear "Agregar mascota" button that opens a modal collecting all metadata first, then photos.

### Modal Layout
- **Trigger:** Primary "Agregar mascota" button in the pets tab header area
- **Width:** ~520px, centered overlay, no new route
- **Close:** ✕ button top-right, or clicking the backdrop
- **Fields (top to bottom):**
  1. Nombre (full width text input)
  2. Edad en meses + Género toggle — side by side (♂ Macho / ♀ Hembra)
  3. Tipo toggle — full width (🐕 Perro / 🐈 Gato)
  4. Descripción (full width text input)
  5. Drag-and-drop photo zone:
     - Dashed border container
     - FontAwesome upload icon (e.g. `faCloudArrowUp`) centered
     - "Haz clic para subir o arrastra y suelta" copy
     - "PNG, JPG, WEBP · Máx. 5 fotos · Se comprimen automáticamente" hint
     - 5 thumbnail preview slots (inline row)
- **Footer:** Cancelar (ghost) / Guardar mascota (primary, `bg-pop-550`)

### Edit Flow
Clicking an existing pet card opens the same modal pre-filled with that pet's data.

### Pet Card — No Photos State
When a pet has no photos, the card image area renders a large `faPaw` FontAwesome icon centered with a muted foreground color. Only fields that contain data are rendered — empty fields are omitted, not shown as blank.

### Design Guidelines
- All spacing on 8pt grid
- Card: `rounded-2xl`, button: `rounded-xl`
- Toggle buttons: `rounded-xl`, active state uses `bg-pop-550/10 border-pop-550/50 text-pop-300`
- Icons: FontAwesome only — no lucide, no inline SVGs
- Drag-and-drop zone: `border-2 border-dashed border-input`, hover state brightens border to `border-pop-550/40`

### Backend Delta
Add two fields to the pet API:

| Field | Type | Values | Required |
|---|---|---|---|
| `gender` | enum | `male`, `female` | yes |
| `species` | enum | `dog`, `cat` | yes |

Affected endpoints: `POST /api/v1/pets`, `PATCH /api/v1/pets/:id`
Affected frontend: `lib/api/pets.ts` — `Pet` interface, `createPet` input, `updatePet` input

---

## Sub-project 2 — Rescue Center Wizard Redesign

### Problem
The current 6-step stepper creates friction: one question per screen feels slow for an organization registering a rescue center. There's also no opportunity to add a pet during onboarding.

### Solution
Replace the stepper with a single scrollable page inspired by Tinder's registration UI: fields on the left, a pet photo grid on the right, with an optional pet section below a centered divider.

### Page Layout

**Topbar**
- Pelú logo (left) only — no language picker

**Hero section**
- Title: "Registra tu centro de rescate"
- Subtitle: "Completa tu perfil para que adoptantes puedan encontrarte"

**Two-column form**
- Left column — center fields:
  1. Nombre del centro
  2. Teléfono
  3. Dirección
  4. RNC (optional) + Sitio web (optional) — side by side in a 2-col subgrid
  5. Instagram (with `@` prefix inside input)
- Right column — "Fotos de la mascota (Opcional)":
  - 1 large main slot (full width, `height: ~116px`)
  - 4 smaller slots (2×2 grid, `height: ~80px` each)
  - All slots: dashed border (`border-2 border-dashed border-input`), `+` icon, hover brightens border
  - Hint below: "Arrastra y suelta · Se comprimen automáticamente"

**Divider**
```
────────────────  Opcional  ────────────────
```
CSS: `display:flex; align-items:center; gap:16px` with `::before` and `::after` pseudo-elements as `flex:1; height:1px; background: border color`

**Optional pet section**
- Section heading: "¿Tienes una mascota lista para adopción?"
- Fields (3-column row):
  1. Nombre + Descripción stacked (wide column)
  2. Edad en meses
  3. Género toggle (♂ / ♀) + Tipo toggle (🐕 / 🐈) stacked
- No separate photo grid here — photos live in the right column above

**Footer**
- Left: "← Cambiar rol" link (routes to `/auth/role-selection`)
- Right: "Enviar solicitud →" primary button

### Submit Behavior
- If optional pet fields are filled **and** photos were uploaded → call `createRescueCenter`, then `createPet` + `uploadPhotos`
- If optional section is blank → call `createRescueCenter` only (same as current behavior)
- On success → existing "¡Solicitud enviada!" pending state screen (no change)

### What Does Not Change
- `createRescueCenter` API call and payload — identical
- Post-submission pending approval screen
- "Cambiar rol" behavior

### Design Guidelines
- Single scrollable page — no steps, no `Stepper` component
- Max content width: `max-w-[920px]` centered
- Two-column grid: `grid-template-columns: 1fr 240px; gap: 32px`
- Optional subgrid (RNC + website): `grid-template-columns: 1fr 1fr; gap: 12px`
- Pet fields row: `grid-template-columns: 1fr 120px auto; gap: 16px`
- All spacing on 8pt grid
- Icons: FontAwesome only
- Inputs: `rounded-xl`, `border border-input bg-background`
- Submit button: `rounded-xl bg-pop-550`

---

## Implementation Order

1. **Backend:** Add `gender` + `species` to pet model/endpoints (backend repo — coordinate separately)
2. **Frontend — Pets Tab:** Update `lib/api/pets.ts` types, then build the Add Pet modal component
3. **Frontend — Wizard:** Replace `components/auth/onboarding/rescue-center-wizard.tsx` stepper with single-page form; wire optional pet creation on submit
