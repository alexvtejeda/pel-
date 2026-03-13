# Backend: Form Seeding, Submissions List & Pet Filters

## Goal

Make the adoption flow work end-to-end by seeding real form template fields on RC approval, adding a submissions list endpoint, and adding vaccinated/castrated filters to the public pet listing.

## Context

- `seedDefaultForm()` in `internal/rescuecenter/handler.go` (line ~303) creates a form with empty fields on RC approval. The INSERT doesn't include a `fields` column, so it defaults to `'[]'`. The form exists but has no questions, so the adopt page shows nothing and redirects.
- The frontend's Interested tab calls `GET /api/v1/submissions` to list all submissions, but that endpoint doesn't exist — only `GET /api/v1/forms/{id}/submissions` does.
- Pets from pending/rejected RCs appear in the public grid because `listPets()` doesn't filter by RC status.
- `vaccinated` and `castrated` are stored on pets but not filterable via query params.

---

## Change 1: Populate `seedDefaultForm()` with template fields

**File:** `internal/rescuecenter/handler.go` — `seedDefaultForm()` function (line ~303)

### Current INSERT
```sql
INSERT INTO forms (rescue_center_id, name, is_special_needs) VALUES ($1, $2, FALSE)
```

### New INSERT
```sql
INSERT INTO forms (rescue_center_id, name, is_special_needs, fields)
SELECT $1, $2, FALSE, $3
WHERE NOT EXISTS (
    SELECT 1 FROM forms WHERE rescue_center_id = $1 AND is_special_needs = FALSE
)
```

The `WHERE NOT EXISTS` guard prevents double-seeding if an RC is approved, rejected, then re-approved. This avoids relying on a unique constraint that doesn't exist on the `forms` table.

### JSONB field structure

Each field in the `fields` array is a JSON object matching the frontend's `FormField` interface:

```json
{
  "id": "uuid-v4-string",
  "type": "short_text | long_text | multiple_choice | checkbox | dropdown | date | rating | file_upload",
  "label": "Question text",
  "description": "",
  "required": true,
  "section": "Section name",
  "options": ["Option 1", "Option 2"],
  "ratingMin": "",
  "ratingMax": "",
  "follow_ups": []
}
```

- `id`: Generate with `uuid.New().String()` for each field
- `type`: One of the 8 field types
- `section`: Groups fields under section headers in the renderer ("Datos Personales", "Información Complementaria", "Compromisos")
- `options`: Only populated for `multiple_choice` and `dropdown` types; empty `[]` for others
- `ratingMin`/`ratingMax`: Empty strings (not used in this template)
- `follow_ups`: Empty `[]` (no conditional follow-ups in the default template)

### Template fields (26 fields, 3 sections)

**Build a Go helper function** (e.g., `defaultFormFields() json.RawMessage`) that constructs the array and marshals to JSON.

#### Section 1: Datos Personales (9 fields)

| # | Label | Type | Required | Options |
|---|-------|------|----------|---------|
| 1 | Nombre completo | `short_text` | yes | — |
| 2 | Edad | `short_text` | yes | — |
| 3 | Estado civil | `multiple_choice` | yes | Casado/a, Unión Libre, Soltero/a, Otro |
| 4 | ¿Tienes hijos? | `multiple_choice` | yes | Sí, 1 · Sí, 2 · Sí, 3 o más · No tengo hijos |
| 5 | ¿A todos los que viven con usted les gustan las mascotas? | `short_text` | no | — |
| 6 | Ocupación y lugar de trabajo | `short_text` | yes | — |
| 7 | Tipo de residencia | `multiple_choice` | yes | Casa propia, Casa alquilada, Apartamento propio, Apartamento alquilado |
| 8 | Dirección y sector donde vive | `short_text` | yes | — |
| 9 | Teléfono de contacto | `short_text` | yes | — |

#### Section 2: Información Complementaria (12 fields)

| # | Label | Type | Required | Options |
|---|-------|------|----------|---------|
| 10 | Si tu última mascota falleció, ¿qué le pasó? | `long_text` | yes | — |
| 11 | Si debe mudarse y no aceptan su mascota donde vaya, ¿qué hará con él/ella? | `long_text` | yes | — |
| 12 | ¿Está su casa preparada para una mascota? ¿Hay algún peligro de que se escape durante su período de adaptación? | `long_text` | yes | — |
| 13 | ¿Planea pasear a su mascota? | `short_text` | no | — |
| 14 | ¿La mascota tendrá acceso a todas las áreas de la casa? | `multiple_choice` | yes | Sí, No, Algunas |
| 15 | ¿Representa un inconveniente que el perro crezca más de lo esperado? ¿Qué haría en ese caso? | `long_text` | yes | — |
| 16 | Busca una mascota con los fines de: | `multiple_choice` | no | Compañía o miembro de la familia, Guardián o cuido, Mascota para finca |
| 17 | ¿Vive con alguna persona alérgica, embarazada o con alguna condición especial? | `multiple_choice` | yes | Alérgica, Embarazada, Condición especial, Ninguna |
| 18 | ¿Tiene planes de irse fuera del país? Si la respuesta es positiva, indique cuándo | `long_text` | yes | — |
| 19 | ¿Cuáles circunstancias justificarían que devolviera a la mascota? | `long_text` | yes | — |
| 20 | Nombre de su veterinaria y su Dr. | `short_text` | yes | — |
| 21 | ¿Tiene vehículo propio? Si su respuesta es no, ¿cómo transportaría la mascota? | `long_text` | yes | — |

#### Section 3: Compromisos (5 fields)

| # | Label | Type | Required | Options |
|---|-------|------|----------|---------|
| 22 | ¿Suele amarrar su mascota? | `short_text` | yes | — |
| 23 | ¿Está consciente que podemos quitarle la mascota amparados por la ley, si está en malas condiciones o un lugar inadecuado? | `multiple_choice` | yes | Sí, estoy consciente · No lo sabía · No estoy de acuerdo |
| 24 | ¿Está de acuerdo en enviar o que solicitemos periódicamente fotos o videos de la mascota como parte del seguimiento? | `multiple_choice` | yes | Sí, No |
| 25 | La esterilización es un requisito para entregar una mascota en adopción. ¿Está dispuesto a comprometerse a hacerlo a corto o mediano plazo? | `multiple_choice` | yes | Sí, No me interesa castrarlo/a |
| 26 | Fotos de la cédula o recibo de algún servicio | `file_upload` | no | — |

---

## Change 2: Add `GET /api/v1/submissions` endpoint

**Files:**
- `internal/submissions/router.go` — Add route `r.Get("/", h.ListForRC)`
- `internal/submissions/handler.go` — Add `ListForRC()` handler
- `internal/submissions/repository.go` — Add query function

The route is already mounted at `/api/v1/submissions` via `submissions.NewRouter` in `cmd/server/main.go` (line 58). Adding `r.Get("/", h.ListForRC)` inside `NewRouter()` is sufficient — no `main.go` changes needed.

### Handler: `ListForRC()`

1. Extract user ID from JWT claims via `auth.ClaimsFromContext(r.Context()).Subject`
2. Look up the RC via `rescuecenter.FindByUserID(ctx, pool, userID)` to get `rc.ID` — this is the established pattern used throughout the codebase (NOT a direct claim extraction)
3. Parse optional `?status=pending|approved|rejected` query param
4. Call repository function with `rc.ID` and optional status filter

### Repository query

```sql
SELECT
    fs.id, fs.form_id, fs.pet_id, fs.member_id, fs.answers,
    fs.status, fs.rejection_note, fs.submitted_at, fs.reviewed_at,
    p.name AS pet_name,
    u.display_name AS member_name,
    f.name AS form_name,
    pp.url AS pet_photo_url
FROM form_submissions fs
JOIN forms f ON f.id = fs.form_id
JOIN pets p ON p.id = fs.pet_id
JOIN users u ON u.id = fs.member_id
LEFT JOIN LATERAL (
    SELECT url FROM pet_photos WHERE pet_id = fs.pet_id ORDER BY position ASC LIMIT 1
) pp ON true
WHERE f.rescue_center_id = $1
-- optional: AND fs.status = $2
ORDER BY fs.submitted_at DESC
```

### Response struct

Create a new `SubmissionDetail` struct (or extend the existing `SubmissionListItem`) with these fields:

```go
type SubmissionDetail struct {
    ID            string          `json:"id"`
    FormID        string          `json:"form_id"`
    PetID         string          `json:"pet_id"`
    MemberID      string          `json:"member_id"`
    Answers       json.RawMessage `json:"answers"`
    Status        string          `json:"status"`
    RejectionNote *string         `json:"rejection_note"`
    SubmittedAt   time.Time       `json:"submitted_at"`
    ReviewedAt    *time.Time      `json:"reviewed_at"`
    PetName       string          `json:"pet_name"`
    PetPhotoURL   *string         `json:"pet_photo_url"`
    MemberName    *string         `json:"member_name"`
    FormName      string          `json:"form_name"`
}
```

Note: The existing `SubmissionListItem` uses `MemberEmail`. This new struct uses `MemberName` (`users.display_name`) instead, matching what the frontend expects. Keep the existing `SubmissionListItem` for `GET /forms/{id}/submissions` to avoid breaking it — use this new struct for the new endpoint.

### Pagination

Not required for MVP. Add a TODO comment for future `LIMIT`/`OFFSET` support.

---

## Change 3: Add vaccinated/castrated filters to `GET /api/v1/pets`

**Files:**
- `internal/pets/handler.go` — `List()` function (starts at line 240)
- `internal/pets/repository.go` — `listPets()` function (line 61)

### Handler changes

Parse two new query params after the existing `size` parsing (line 244):

```go
vaccinated := r.URL.Query().Get("vaccinated")
castrated := r.URL.Query().Get("castrated")

if vaccinated != "" && vaccinated != "true" && vaccinated != "false" {
    api.WriteError(w, http.StatusBadRequest, "vaccinated must be 'true' or 'false'")
    return
}
if castrated != "" && castrated != "true" && castrated != "false" {
    api.WriteError(w, http.StatusBadRequest, "castrated must be 'true' or 'false'")
    return
}
```

### Repository changes

The current `listPets()` signature has 7 parameters. Add `vaccinated` and `castrated` as `string` params (empty string = don't filter):

```go
func listPets(ctx context.Context, pool *pgxpool.Pool,
    rescueCenterID, species, gender, size, vaccinated, castrated string,
    onlyAvailable bool) ([]*Pet, error)
```

In the dynamic WHERE clause builder, add:
```go
if vaccinated != "" {
    args = append(args, vaccinated == "true")
    conditions = append(conditions, fmt.Sprintf("vaccinated = $%d", len(args)))
}
if castrated != "" {
    args = append(args, castrated == "true")
    conditions = append(conditions, fmt.Sprintf("castrated = $%d", len(args)))
}
```

---

## Change 4: Filter public pets by RC approval status

**File:** `internal/pets/repository.go` — `listPets()` function

When `onlyAvailable = true` (public listing), add to the WHERE clause:

```sql
AND rescue_center_id IN (SELECT id FROM rescue_centers WHERE status = 'active')
```

This ensures pets from pending or rejected RCs never appear in the public grid. For MVP scale this subquery is fine — can be converted to an `INNER JOIN` later if needed for performance.
