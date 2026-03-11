# Adoption Forms — Backend Spec (Go repo)

> **Blocks:** adoption-forms-builder, adoption-flow
> **Depends on:** rescue-center approval flow (existing)

## Summary

Database and API layer for rescue center adoption forms, form submissions, pet conditions, and RC logo. All endpoints are authenticated unless marked public.

---

## Database Changes

### `pets` table — add conditions

```sql
ALTER TABLE pets ADD COLUMN conditions    TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE pets ADD COLUMN condition_notes TEXT;
```

`conditions` stores an array of specific condition keys:
`mobility_missing_limb`, `sensory_blind`, `sensory_deaf`, `medical_chronic`, `medical_fiv_felv`, `behavioral_aggressive`, `behavioral_trauma`, `behavioral_anxiety`, `dietary_weight`.

Empty array means no special conditions.

---

### `rescue_centers` table — add logo

```sql
ALTER TABLE rescue_centers ADD COLUMN logo_url TEXT;
```

One logo per rescue center, shared across all their forms.

---

### New table: `forms`

```sql
CREATE TABLE forms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rescue_center_id    UUID NOT NULL REFERENCES rescue_centers(id) ON DELETE CASCADE,
  name                VARCHAR(200) NOT NULL,           -- e.g. "Formulario estándar"
  is_special_needs    BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = special conditions form
  fields              JSONB NOT NULL DEFAULT '[]',     -- FormField[] (see shape below)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forms_rescue_center_id ON forms(rescue_center_id);
```

#### `fields` JSONB shape

```typescript
interface FormField {
  id: string              // client-generated UUID
  type: 'short_text' | 'long_text' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'date' | 'rating' | 'file_upload'
  label: string
  description: string
  required: boolean
  options: string[]       // for multiple_choice, checkbox, dropdown
  rating_min: string      // label for low end of rating scale
  rating_max: string      // label for high end
  section: string         // section header label, empty string if none
  follow_ups: Array<{
    when_answer: string   // the specific option text that triggers this
    field: FormField      // nested field — no further nesting allowed
  }>
}
```

`follow_ups` is only valid on `multiple_choice` and `dropdown` fields.

---

### New table: `form_submissions`

```sql
CREATE TABLE form_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers         JSONB NOT NULL DEFAULT '{}',    -- map of field_id → answer (see shape below)
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  rejection_note  TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

CREATE INDEX idx_submissions_form_id    ON form_submissions(form_id);
CREATE INDEX idx_submissions_pet_id     ON form_submissions(pet_id);
CREATE INDEX idx_submissions_member_id  ON form_submissions(member_id);
CREATE INDEX idx_submissions_status     ON form_submissions(status);
```

#### `answers` JSONB shape

```typescript
// key = FormField.id
type Answers = Record<string, AnswerValue>

type AnswerValue =
  | string          // short_text, long_text, date, dropdown
  | string[]        // checkbox, multiple_choice (single string in array for radio)
  | string          // file_upload: stored file URL after upload
```

---

## Default Template Seeding

When a rescue center is approved (`status` changes to `'approved'`), the backend automatically inserts one `forms` row with `is_special_needs = FALSE` and the default field set below. This happens in the same transaction as the approval.

### Default fields (in order)

**Section: Datos Personales**

| label | type | required | options |
|---|---|---|---|
| Nombre | short_text | yes | — |
| Edad | short_text | yes | — |
| Estado civil | multiple_choice | yes | Casado/a, Unión Libre, Soltero/a, Otro |
| ¿Tienes hijos? | multiple_choice | no | Sí, 1; Sí, 2; Sí, 3 o más; No tengo hijos |
| ¿A todos los que viven contigo les gustan las mascotas? | short_text | no | — |
| Ocupación y lugar de trabajo | short_text | yes | — |
| Tipo de residencia | multiple_choice | yes | Casa propia, Casa alquilada, Apartamento propio, Apartamento alquilado |
| Dirección y sector donde vives | short_text | yes | — |
| Teléfono de contacto | short_text | yes | — |

**Section: Información Complementaria**

| label | type | required | notes |
|---|---|---|---|
| ¿Está tu hogar preparado para una mascota? ¿Hay algún peligro de que se escape durante su período de adaptación? | long_text | yes | — |
| Si debes mudarte y no aceptan a tu mascota, ¿qué harás con él/ella? | long_text | yes | — |
| ¿Planeas pasear a tu mascota? | long_text | no | — |
| ¿La mascota tendrá acceso a todas las áreas del hogar? | multiple_choice | yes | Sí, No, Algunas |
| ¿Representa un inconveniente que la mascota crezca más de lo esperado? ¿Qué harías en ese caso? | long_text | yes | — |
| ¿Con qué propósito buscas una mascota? | multiple_choice | no | Compañía / miembro de la familia, Guardián o cuido, Mascota para finca |
| ¿Vives con alguna persona alérgica, embarazada o con alguna condición especial? | multiple_choice | yes | Alérgica, Embarazada, Condición especial, Ninguna |
| ¿Tienes planes de irte fuera del país? Si es así, indica cuándo. | long_text | yes | — |
| ¿Cuáles circunstancias justificarían que devolvieras a la mascota? | long_text | yes | — |
| Nombre de tu veterinaria y su Dr. | short_text | yes | — |
| ¿Tienes vehículo propio? Si no, ¿cómo transportarías la mascota? | long_text | yes | — |
| ¿Sueles amarrar a tu mascota? | short_text | yes | — |
| Si tu última mascota falleció, ¿qué le pasó? | long_text | no | — |

**Section: Compromisos**

| label | type | required | options |
|---|---|---|---|
| ¿Estás consciente de que podemos retirar la mascota amparados por la ley si está en malas condiciones? | multiple_choice | yes | Sí, estoy consciente; No lo sabía; No estoy de acuerdo |
| ¿Estás de acuerdo en enviar periódicamente fotos o videos de la mascota como parte del seguimiento? | multiple_choice | yes | Sí, No |
| La esterilización es un requisito para la adopción. ¿Estás dispuesto a comprometerte a castrarlo/a si aún no lo está? | multiple_choice | yes | Sí, No me interesa |
| Confirmo que he enviado fotos/videos del hogar por WhatsApp | checkbox | no | Confirmo que las fotos o videos fueron compartidas |

---

## API Endpoints

### RC Logo

**`POST /api/v1/rescue-centers/me/logo`**
- Auth: `rescue_center` role
- Body: `multipart/form-data`, field `logo` (image file, max 5MB, PNG/JPG/WEBP)
- Resizes/compresses to 1600×400 before storing
- Returns: `{ logo_url: string }`
- Updates `rescue_centers.logo_url`

---

### Forms

**`GET /api/v1/forms`**
- Auth: `rescue_center` role
- Returns all forms belonging to the authenticated RC
- Response: `FormSummary[]` (id, name, is_special_needs, field count, updated_at)

**`POST /api/v1/forms`**
- Auth: `rescue_center` role
- Body: `{ name: string, is_special_needs: boolean }`
- Creates an empty form (no fields). RC must then PUT to add fields.
- Returns: full `Form` object

**`GET /api/v1/forms/:id`**
- Auth: `rescue_center` role (must own the form)
- Returns full form including fields JSONB

**`PUT /api/v1/forms/:id`**
- Auth: `rescue_center` role (must own the form)
- Body: `{ name?: string, fields?: FormField[] }`
- Full replace of fields array (send the complete updated array)
- Updates `updated_at`
- Returns: updated `Form`

**`DELETE /api/v1/forms/:id`**
- Auth: `rescue_center` role (must own the form)
- Soft constraint: cannot delete if the form has any submissions

---

### Form routing (public — used by member fill page)

**`GET /api/v1/pets/:id/form`**
- Auth: none (public)
- Resolves which form to serve for a pet:
  - Pet `conditions` is empty → return RC's form where `is_special_needs = FALSE` (default)
  - Pet has conditions + RC has `is_special_needs = TRUE` form → return that form
  - Pet has conditions + no special needs form → return default form + `{ advisory: true }`
- Returns: `{ form: Form, rc: { name, logo_url }, advisory: boolean }`

---

### Submissions

**`POST /api/v1/pets/:id/submissions`**
- Auth: `member` role
- Body: `{ form_id: string, answers: Answers }`
- Validates all required fields are answered
- Inserts `form_submissions` row with `status = 'pending'`
- Triggers notification to the RC (see Notifications below)
- Returns: `{ submission_id: string }`

**`GET /api/v1/forms/:id/submissions`**
- Auth: `rescue_center` role (must own the form)
- Returns list of submissions with member name, pet name, status, submitted_at
- Supports `?status=pending|approved|rejected` filter

**`GET /api/v1/submissions/:id`**
- Auth: `rescue_center` role (must own the submission's form)
- Returns full submission: all answers, file URLs, member info, pet info

**`PATCH /api/v1/submissions/:id`**
- Auth: `rescue_center` role
- Body: `{ status: 'approved' | 'rejected', rejection_note?: string }`
- On `approved`: creates a chat thread between RC and member (see chat spec when built), sends approval notification to member
- On `rejected`: sends rejection notification to member with optional note
- Updates `reviewed_at`

---

### File uploads (submission attachments)

**`POST /api/v1/submissions/:id/files`**
- Auth: `member` role (must own the submission)
- Body: `multipart/form-data`, field `file` + `field_id`
- Stores file, updates `answers[field_id]` with the file URL
- Max 10MB, PNG/JPG/WEBP/PDF
- Returns: `{ url: string }`

---

## Notifications

On `POST /api/v1/pets/:id/submissions`:
- Insert a notification row for the RC: *"Nueva solicitud de adopción para [pet name] de [member name]"*

On `PATCH /api/v1/submissions/:id` with `approved`:
- Insert notification for the member: *"¡Tu solicitud para adoptar a [pet name] fue aprobada!"*

On `PATCH /api/v1/submissions/:id` with `rejected`:
- Insert notification for the member: *"Tu solicitud para adoptar a [pet name] no fue aceptada."* + rejection note if provided

Notification delivery follows the existing notifications pattern.

---

## Pets endpoint update

`POST /api/v1/pets` and `PATCH /api/v1/pets/:id` must accept and persist:
```json
{
  "conditions": ["sensory_blind", "behavioral_trauma"],
  "condition_notes": "Perdió la vista por un accidente."
}
```

`GET /api/v1/pets` and `GET /api/v1/pets/:id` must include `conditions` and `condition_notes` in the response.
