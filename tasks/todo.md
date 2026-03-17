# UI Fixes, Member Upload, Interested Improvements & Metrics — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix RC wizard UI issues, add verified badges + source filters to pet grid, enable member pet uploads, improve the interested people flow in RC dashboard, and add a pet metrics tab.

**Architecture:** Four independent specs implemented sequentially. Spec A (wizard fixes + grid) has no dependencies. Spec B (member upload) depends on backend extensions. Spec C (interested improvements) needs submission_count from backend. Spec D (metrics) needs pet_events table + endpoints. Frontend code is built assuming backend will catch up — graceful handling of missing data.

**Tech Stack:** Next.js 16, React 19, TailwindCSS v4, Font Awesome, shadcn/ui, recharts (new for Spec D)

**Specs:** `docs/superpowers/specs/2026-03-16-*.md`

**No test framework** — verify with `npx tsc --noEmit` and visual testing in browser.

---

## Spec A: Quick UI Fixes + Pet Grid Enhancements

### Task 1: RC Wizard — Add text labels to vaccinated/castrated checkboxes

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx:448-460`

- [ ] **Step 1: Add "Vacunado" and "Castrado" text labels**

In the checkbox section (~line 448-460), find the two `<label>` elements that contain only the FontAwesome icons. Add a `<span>` with the text after each icon:

```tsx
<label className="flex items-center gap-2 text-sm text-white/70">
  <input type="checkbox" className="w-4 h-4 rounded accent-pop-550" checked={petVaccinated} onChange={e => setPetVaccinated(e.target.checked)} />
  <FontAwesomeIcon icon={faSyringe} className="w-3.5 h-3.5" />
  <span>Vacunado</span>
</label>
<label className="flex items-center gap-2 text-sm text-white/70">
  <input type="checkbox" className="w-4 h-4 rounded accent-pop-550" checked={petCastrated} onChange={e => setPetCastrated(e.target.checked)} />
  <FontAwesomeIcon icon={faScissors} className="w-3.5 h-3.5" />
  <span>Castrado</span>
</label>
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Visual: open RC wizard, confirm labels appear next to icons.

- [ ] **Step 3: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "fix: add text labels to vaccinated/castrated checkboxes in RC wizard"
```

---

### Task 2: RC Wizard — Fix size dropdown text visibility

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx:461-473`

- [ ] **Step 1: Fix select and option text colors**

Find the `<select>` for pet size (~line 461-473). Ensure the `<select>` has `text-white` and each `<option>` has explicit dark background:

```tsx
<select
  value={petSize}
  onChange={e => setPetSize(e.target.value as 'small' | 'medium' | 'large')}
  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pop-550"
>
  <option value="small" className="bg-zinc-800 text-white">Pequeño</option>
  <option value="medium" className="bg-zinc-800 text-white">Mediano</option>
  <option value="large" className="bg-zinc-800 text-white">Grande</option>
</select>
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Visual: open RC wizard, confirm size dropdown text is readable.

- [ ] **Step 3: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "fix: make size dropdown text visible in RC wizard"
```

---

### Task 3: RC Wizard — Add months/years age toggle

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx:372-385` (age input) and `~line 139` (submit handler)

- [ ] **Step 1: Add ageUnit state**

Near the existing `petAge` state declaration, add:

```tsx
const [petAgeUnit, setPetAgeUnit] = useState<'months' | 'years'>('years')
```

- [ ] **Step 2: Replace age input with toggle buttons**

Replace the age input section (~line 372-385) to include toggle buttons:

```tsx
<div className="flex items-center gap-2">
  <input
    type="number"
    min={0}
    value={petAge}
    onChange={e => setPetAge(e.target.value)}
    placeholder="Edad"
    className="w-20 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-pop-550"
  />
  <div className="flex rounded-xl overflow-hidden border border-white/20">
    <button
      type="button"
      onClick={() => setPetAgeUnit('months')}
      className={`px-3 py-2.5 text-xs transition-colors ${petAgeUnit === 'months' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'bg-white/10 text-white/50'}`}
    >
      Meses
    </button>
    <button
      type="button"
      onClick={() => setPetAgeUnit('years')}
      className={`px-3 py-2.5 text-xs transition-colors ${petAgeUnit === 'years' ? 'bg-pop-550/10 border-pop-550/50 text-pop-300' : 'bg-white/10 text-white/50'}`}
    >
      Años
    </button>
  </div>
</div>
```

- [ ] **Step 3: Update submit handler to convert to months**

In the submit handler (~line 139), change the age conversion:

```tsx
age: petAge !== '' ? (petAgeUnit === 'years' ? parseInt(petAge, 10) * 12 : parseInt(petAge, 10)) : 0,
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Visual: open RC wizard, confirm toggle works and switches between Meses/Años.

- [ ] **Step 5: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "feat: add months/years age toggle to RC wizard"
```

---

### Task 4: Pet Grid — Add RC verified badge

**Files:**
- Modify: `components/pets/pet-grid.tsx:165-247`
- Import: `faCertificate, faCheck` from `@fortawesome/free-solid-svg-icons`

- [ ] **Step 1: Add imports**

Add `faCertificate` and `faCheck` to the existing FontAwesome imports in `pet-grid.tsx`.

- [ ] **Step 2: Add verified badge to pet cards**

Inside the pet card render (~line 165-247), after the existing card content, add the verified badge conditionally:

```tsx
{pet.rescue_center && (
  <span className="absolute top-2 right-2 w-5 h-5 drop-shadow-md">
    <FontAwesomeIcon icon={faCertificate} className="absolute inset-0 w-full h-full text-pop-550" />
    <FontAwesomeIcon icon={faCheck} className="absolute inset-0 w-full h-full text-white p-1" />
  </span>
)}
```

Place this inside the card's relative container, near the top-right area.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Visual: open `/pets`, confirm RC pets show the verified badge and member pets don't.

- [ ] **Step 4: Commit**

```bash
git add components/pets/pet-grid.tsx
git commit -m "feat: add verified badge to RC pet cards in public grid"
```

---

### Task 5: Pet Grid — Sort RC pets first + add source filters

**Files:**
- Modify: `components/pets/pet-grid.tsx:93-134` (filters) and pet rendering section

- [ ] **Step 1: Add source filter state**

Add state inside the `PetGrid` component:

```tsx
const [sourceFilter, setSourceFilter] = useState<'all' | 'rc' | 'member'>('all')
```

- [ ] **Step 2: Sort pets — RC first**

After receiving pets data, sort so RC pets come first:

```tsx
const sortedPets = [...pets].sort((a, b) => {
  const aIsRc = a.rescue_center ? 0 : 1
  const bIsRc = b.rescue_center ? 0 : 1
  return aIsRc - bIsRc
})
```

Use `sortedPets` in the filter chain instead of `pets`.

- [ ] **Step 3: Add filter dividers and source filter pills**

In the filter bar section (~line 93-134), after the existing filter pills and vaccinated/castrated toggles, add two dividers and two new pills:

```tsx
{/* Divider before health toggles */}
<span className="text-muted-foreground/30 mx-1 select-none">|</span>
{/* ... existing vaccinated/castrated toggles ... */}

{/* Divider before source filters */}
<span className="text-muted-foreground/30 mx-1 select-none">|</span>

<button
  onClick={() => setSourceFilter(sourceFilter === 'rc' ? 'all' : 'rc')}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${sourceFilter === 'rc' ? 'bg-pop-550 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
>
  <FontAwesomeIcon icon={faHouseChimney} className="w-3 h-3" />
  Centros
</button>
<button
  onClick={() => setSourceFilter(sourceFilter === 'member' ? 'all' : 'member')}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${sourceFilter === 'member' ? 'bg-pop-550 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
>
  <FontAwesomeIcon icon={faUser} className="w-3 h-3" />
  Miembros
</button>
```

Import `faHouseChimney, faUser` from `@fortawesome/free-solid-svg-icons`.

- [ ] **Step 4: Apply source filter to pet list**

In the filtering logic, add the source filter:

```tsx
const sourceFiltered = sourceFilter === 'all'
  ? sortedPets
  : sourceFilter === 'rc'
    ? sortedPets.filter(p => p.rescue_center !== null && p.rescue_center !== undefined)
    : sortedPets.filter(p => !p.rescue_center)
```

Use `sourceFiltered` as input to the rest of the filter chain.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Visual: open `/pets`, confirm dividers appear, source filters toggle correctly.

- [ ] **Step 6: Commit**

```bash
git add components/pets/pet-grid.tsx
git commit -m "feat: add pet hierarchy (RC first) and source filters to pet grid"
```

---

## Spec B: Member Pet Upload

### Task 6: Extend UserPet type and API

**Files:**
- Modify: `lib/api/user-pets.ts`

- [ ] **Step 1: Extend UserPet interface**

Add the new fields to `UserPet`:

```tsx
export interface UserPet {
  id: string
  user_id: string
  name: string
  age: number
  species: 'dog' | 'cat'
  gender: 'male' | 'female'
  description?: string
  size?: 'small' | 'medium' | 'large'
  vaccinated?: boolean
  castrated?: boolean
  photos?: { id: string; url: string; position: number }[]
  created_at: string
}
```

- [ ] **Step 2: Add BASE_URL and photo upload function**

Add `const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'` at the top.

Add below existing functions:

```tsx
export async function uploadUserPetPhotos(
  petId: string,
  files: File[]
): Promise<{ data: { id: string; url: string; position: number }[] | null; error: string | null }> {
  try {
    const form = new FormData()
    files.forEach(f => form.append('photos', f))
    const res = await fetch(`${BASE_URL}/api/v1/user-pets/${petId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al subir fotos' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 3: Verify & commit**

```bash
npx tsc --noEmit
git add lib/api/user-pets.ts
git commit -m "feat: extend user-pets API with new fields and photo upload"
```

---

### Task 7: Create MemberAddPetModal component

**Files:**
- Create: `components/pets/member-add-pet-modal.tsx`

- [ ] **Step 1: Create the modal component**

Build a modal component that mirrors the RC add-pet-modal's two-panel layout. It should:
- Accept `open: boolean` and `onClose: () => void` props
- Left panel: form with name, species, gender, age (with months/years toggle), size, description, vaccinated, castrated, photo upload zone
- Right panel: live card preview using the same pattern as RC modal
- Submit button: "Publicar mascota"
- On submit: call `createUserPets([petData])`, then `uploadUserPetPhotos(id, files)` if photos exist
- On success: call `onClose()`
- On error: show inline error

Use shadcn Dialog, same field layout and styling as `add-pet-modal.tsx`. Reference `components/dashboard/rescue-center/add-pet-modal.tsx` for exact patterns. Simpler version — no conditions, no condition_notes. ~200-300 lines.

- [ ] **Step 2: Verify & commit**

```bash
npx tsc --noEmit
git add components/pets/member-add-pet-modal.tsx
git commit -m "feat: create member add pet modal component"
```

---

### Task 8: Wire up sidebar entry point

**Files:**
- Modify: `components/pets/pets-header.tsx:165-193`

- [ ] **Step 1: Add state and import**

```tsx
import { MemberAddPetModal } from '@/components/pets/member-add-pet-modal'
```

Add state: `const [addPetOpen, setAddPetOpen] = useState(false)`

- [ ] **Step 2: Add "Publicar mascota" button in sidebar nav**

In the `<nav>` section (~line 165), before the logout button, add:

```tsx
{user?.role === 'member' && (
  <button
    onClick={() => { setSheetOpen(false); setAddPetOpen(true) }}
    className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors w-full text-left"
  >
    <FontAwesomeIcon icon={faPaw} className="text-lg text-pop-550" />
    Publicar mascota
  </button>
)}
```

Import `faPaw` if not already imported.

- [ ] **Step 3: Render the modal after the Sheet**

```tsx
<MemberAddPetModal open={addPetOpen} onClose={() => setAddPetOpen(false)} />
```

- [ ] **Step 4: Verify & commit**

```bash
npx tsc --noEmit
git add components/pets/pets-header.tsx
git commit -m "feat: add member pet upload entry point in sidebar"
```

---

## Spec C: RC Dashboard Interested Improvements

### Task 9: Add submission_count to Pet type + pet_id to listSubmissions

**Files:**
- Modify: `lib/api/pets.ts` (Pet interface)
- Modify: `lib/api/submissions.ts:5-20, 62-76`

- [x] **Step 1: Add submission_count to Pet**

In the `Pet` interface, add: `submission_count?: number`

- [x] **Step 2: Add member_email and pet_id filter to listSubmissions**

Add `member_email?: string` to `Submission` interface.

Update `listSubmissions` params:

```tsx
export async function listSubmissions(
  params?: { status?: 'pending' | 'approved' | 'rejected'; pet_id?: string }
): Promise<{ data: Submission[] | null; error: string | null }> {
  try {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.pet_id) query.set('pet_id', params.pet_id)
    // ...rest unchanged
```

- [x] **Step 3: Verify & commit**

```bash
npx tsc --noEmit
git add lib/api/pets.ts lib/api/submissions.ts
git commit -m "feat: add submission_count to Pet and pet_id filter to submissions"
```

---

### Task 10: Add interest badge + dropdown to pets-tab cards

**Files:**
- Modify: `components/dashboard/rescue-center/pets-tab.tsx:769-853`

- [x] **Step 1: Add interest badge with Popover**

In the pet card render section, add a badge + Popover when `pet.submission_count > 0`. Import `Popover, PopoverTrigger, PopoverContent` from shadcn and `faHeart` from Font Awesome.

Create an `InterestedDropdown` component (inline or same file):
- Fetches `listSubmissions({ pet_id: petId })` on mount
- Shows spinner while loading
- Renders rows: avatar, name (member_name → member_email → "Solicitante"), time, status badge
- Each row clickable → calls `onSelectSubmission(id)`

- [x] **Step 2: Add onNavigateToSubmission prop**

Add prop to `PetsTab` (or `PetsTabProps`):

```tsx
onNavigateToSubmission?: (submissionId: string) => void
```

Wire InterestedDropdown's onSelectSubmission to this prop.

- [x] **Step 3: Verify & commit**

```bash
npx tsc --noEmit
git add components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat: add interest count badge with dropdown to RC pet cards"
```

---

### Task 11: Wire cross-tab navigation in DashboardShell

**Files:**
- Modify: `components/dashboard/rescue-center/dashboard-shell.tsx`

- [x] **Step 1: Add targetSubmissionId state and handler**

```tsx
const [targetSubmissionId, setTargetSubmissionId] = useState<string | null>(null)

const handleNavigateToSubmission = (submissionId: string) => {
  setTargetSubmissionId(submissionId)
  setActiveTab('interested')
}
```

- [x] **Step 2: Pass props**

```tsx
{activeTab === 'pets' && <PetsTab ref={petsTabRef} onNavigateToSubmission={handleNavigateToSubmission} />}
{activeTab === 'interested' && (
  <InterestedTab
    onAddToAgenda={addAgendaItem}
    targetSubmissionId={targetSubmissionId}
    onTargetHandled={() => setTargetSubmissionId(null)}
  />
)}
```

- [x] **Step 3: Verify & commit**

```bash
npx tsc --noEmit
git add components/dashboard/rescue-center/dashboard-shell.tsx
git commit -m "feat: wire cross-tab submission navigation in dashboard shell"
```

---

### Task 12: Add search bar and target handling to InterestedTab

**Files:**
- Modify: `components/dashboard/rescue-center/interested-tab.tsx:53-124`

- [x] **Step 1: Add new props**

```tsx
targetSubmissionId?: string | null
onTargetHandled?: () => void
```

- [x] **Step 2: Add auto-open for target submission**

useEffect: when `targetSubmissionId` is set and submissions loaded, find and open the detail view, then call `onTargetHandled()`.

- [x] **Step 3: Add pet search bar with autocomplete**

- `petSearch` state + `selectedPetId` state
- Extract unique pets from submissions
- Show autocomplete dropdown when typing (match pet names)
- Each suggestion: pet thumbnail, name (bold match), count
- On select: filter table by pet_id
- Place alongside existing status filter in a flex row

- [x] **Step 4: Verify & commit**

```bash
npx tsc --noEmit
git add components/dashboard/rescue-center/interested-tab.tsx
git commit -m "feat: add pet search bar and cross-tab navigation to interested tab"
```

---

## Spec D: Pet Metrics

### Task 13: Install recharts + create metrics API

**Files:**
- Create: `lib/api/metrics.ts`

- [ ] **Step 1: Install recharts**

```bash
bun add recharts
```

- [ ] **Step 2: Create lib/api/metrics.ts**

Full module with:
- `MetricsResponse` interface
- `trackPetEvent(petId, eventType)` — fire-and-forget, non-async, 30s debounce via module-level Set
- `getMetrics(period)` — authenticated, returns `{ data, error }`

(See spec for complete code)

- [ ] **Step 3: Verify & commit**

```bash
npx tsc --noEmit
git add lib/api/metrics.ts
git commit -m "feat: create metrics API module with event tracking"
```

---

### Task 14: Add event tracking to pet-detail

**Files:**
- Modify: `components/pets/pet-detail.tsx`

- [ ] **Step 1: Track view on pet selection**

Import `trackPetEvent`. Add useEffect:

```tsx
useEffect(() => {
  if (pet?.id) trackPetEvent(pet.id, 'view')
}, [pet?.id])
```

- [ ] **Step 2: Track adopt click**

In `handleAdopt`, before router.push: `trackPetEvent(pet.id, 'adopt_click')`

- [ ] **Step 3: Verify & commit**

```bash
npx tsc --noEmit
git add components/pets/pet-detail.tsx
git commit -m "feat: track pet view and adopt click events"
```

---

### Task 15: Add Métricas tab to RC dashboard navigation

**Files:**
- Modify: `components/dashboard/rescue-center/dashboard-shell.tsx`
- Modify: `components/dashboard/rescue-center/rescue-center-sidebar.tsx`
- Modify: `components/dashboard/rescue-center/mobile-bottom-nav.tsx`

- [ ] **Step 1: Update Tab type in all 3 files**

Add `'metrics'` to the Tab union (before `'settings'`).

- [ ] **Step 2: Add nav items**

Sidebar: add `{ tab: 'metrics', label: 'Métricas', icon: faChartLine }` before settings.
Mobile: add same item. Import `faChartLine`.

- [ ] **Step 3: Add tab title and render in shell**

```tsx
metrics: 'Métricas',
// ...
{activeTab === 'metrics' && <MetricsTab />}
```

Import MetricsTab.

- [ ] **Step 4: Verify & commit**

```bash
npx tsc --noEmit
git add components/dashboard/rescue-center/dashboard-shell.tsx components/dashboard/rescue-center/rescue-center-sidebar.tsx components/dashboard/rescue-center/mobile-bottom-nav.tsx
git commit -m "feat: add Métricas tab to RC dashboard navigation"
```

---

### Task 16: Create MetricsTab component

**Files:**
- Create: `components/dashboard/rescue-center/metrics-tab.tsx`

- [ ] **Step 1: Create the full component**

Sections (top to bottom):
1. **Time range toggle** — "7 días" / "30 días" / "Todo"
2. **Summary cards** — 3x shadcn Card: Total vistas (faEye), Clics en adoptar (faHandPointer), Conversión (faArrowTrendUp)
3. **Area chart** — recharts AreaChart with views + adopt_clicks lines
4. **Per-pet table** — shadcn Table with photo, name, views, adopt clicks, conversion, trend bar
5. **Empty state** — faChartLine + "Sin datos aún"

Use `getMetrics(period)` to fetch data. Format numbers with `toLocaleString()`. Conversion threshold: green >= 5%, red < 5%. Low-conversion tip at < 3%.

- [ ] **Step 2: Verify & commit**

```bash
npx tsc --noEmit
git add components/dashboard/rescue-center/metrics-tab.tsx
git commit -m "feat: create MetricsTab component with cards, chart, and table"
```

---

## Final Review

- [ ] Run `npx tsc --noEmit` — confirm zero errors
- [ ] Visual spot-check all 4 specs in browser
- [ ] Write review summary below

### Review Summary
_(to be filled after implementation)_
