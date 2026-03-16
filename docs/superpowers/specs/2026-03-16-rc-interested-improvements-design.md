# Spec C: RC Dashboard — Interested Improvements

## Overview

Three improvements to the RC dashboard's interested people flow: (1) interest count badges on pet cards in the Pets tab, (2) a clickable dropdown showing interested people, and (3) a pet search bar in the Interested tab.

## 1. Interest Count Badge on Pet Cards

**File:** `components/dashboard/rescue-center/pets-tab.tsx`

### Data

Need the interest count (number of submissions) per pet. Two options:

- **Option A (preferred):** Backend includes `submission_count` in the pet object returned by `GET /api/v1/pets?rescue_center_id=X`
- **Option B:** Frontend counts from the submissions list (requires loading all submissions upfront — less efficient)

Recommend Option A — a simple `COUNT(*)` join in the pets query. The `Pet` TypeScript interface in `lib/api/pets.ts` needs to be extended with `submission_count?: number` (optional since it's only returned for RC-owned queries).

### Badge UI

On each pet card, when `submission_count > 0`, show a badge at the bottom-left:
- Positioned: `absolute bottom-2 left-2`
- Style: `bg-pop-550/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-xl`
- Content: `faHeart` icon + `{count} interesado(s)`
- Cursor: `pointer`
- On click: opens the interested people dropdown (see section 2)

When `submission_count === 0`: no badge shown.

## 2. Interested People Dropdown

**File:** `components/dashboard/rescue-center/pets-tab.tsx` (inline popover)

When the interest badge is clicked, show a dropdown/popover anchored to the badge:

### Dropdown Content

- Max height: `max-h-64 overflow-y-auto`
- Style: `bg-card border border-border rounded-2xl shadow-lg`
- Each row shows:
  - Avatar circle (initials or `faCircleUser` icon)
  - Name (`display_name` or email)
  - Relative timestamp ("Hace 2h")
  - Status badge: Pendiente (amber), Aprobado (green), Rechazado (red)
- Each row is clickable

### Dismiss Behavior

Use shadcn `Popover` component (handles click-outside and Escape key automatically). Anchor the popover to the interest badge element.

### Data Source

Fetch submissions for the specific pet when dropdown opens:
- Update `listSubmissions()` in `lib/api/submissions.ts` to accept an optional `pet_id` query param
- Call `listSubmissions({ pet_id: petId })` when the popover opens
- Show a spinner inside the popover while loading

### Name Display

Each row shows the submitter's name. The submission object includes `member_name` (from `display_name`). Fallback chain: `submission.member_name` → `submission.member_email` → "Solicitante". The backend already returns `member_name` and `member_email` in the submission response.

### Click Action

Clicking a person in the dropdown:
1. Switches to the "Interesados" tab
2. Opens that submission's detail view directly

**Cross-tab communication interface:**

`PetsTab` receives a new prop:
```ts
onNavigateToSubmission: (submissionId: string) => void
```

`DashboardShell` (`dashboard-shell.tsx`) manages this:
```ts
const [targetSubmissionId, setTargetSubmissionId] = useState<string | null>(null)

const handleNavigateToSubmission = (submissionId: string) => {
  setTargetSubmissionId(submissionId)
  setActiveTab('interested')
}
```

`InterestedTab` receives a new prop:
```ts
targetSubmissionId?: string | null
onTargetHandled?: () => void  // clears the target after opening
```

When `targetSubmissionId` is set, the Interested tab auto-opens that submission's detail view on mount/update, then calls `onTargetHandled()` to clear it.

## 3. Pet Search Bar in Interested Tab

**File:** `components/dashboard/rescue-center/interested-tab.tsx`

### Search Bar

Add a search input above the submissions table, alongside the existing status filter:
- Layout: `flex gap-3` — search input (flex-1) + status select
- Search input: `faSearch` icon left, placeholder "Buscar por mascota..."
- Searches against `pet.name` from the submissions list (client-side filter)

### Autocomplete Dropdown

As the user types, show a dropdown with matching pet names:
- Each suggestion shows: pet photo thumbnail (28x28, rounded-lg), pet name (bold matching chars), submission count (derived client-side by counting submissions with matching `pet_id` in the already-loaded list)
- Clicking a suggestion filters the table to only that pet's submissions
- Clearing the search shows all submissions again

### Implementation

Client-side filtering is sufficient since RCs won't have thousands of submissions:
1. Extract unique pets from submissions list
2. Filter by search term (case-insensitive `includes`)
3. Show autocomplete dropdown with matches
4. On select: filter submissions table by `pet_id`

## Navigation Flow

```
Pet card (Pets tab)
  → Click interest badge
    → Dropdown with interested people
      → Click a person
        → Switch to Interested tab
          → Open that submission's detail view
```

## i18n Keys

Add to `pets` namespace (RC dashboard strings already live here):
- `interested.search_placeholder` — "Buscar por mascota..." / "Search by pet..."
- `interested.interested_count` — "{{count}} interesado(s)" / "{{count}} interested"
- `interested.no_interest` — (no badge shown, no key needed)

## Backend Dependencies

1. **`submission_count` on pets:** `GET /api/v1/pets` should include `submission_count` (integer) for each pet when requested by the owning RC
2. **Filter submissions by pet:** `GET /api/v1/submissions?pet_id={uuid}` — new optional query param to filter submissions for a specific pet
3. **Submissions include pet info:** each submission should include `pet: { id, name, photos }` and `member_name`, `member_email` (likely already included based on current interested-tab.tsx)
