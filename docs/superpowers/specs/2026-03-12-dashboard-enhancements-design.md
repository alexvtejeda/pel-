# Spec C: Dashboard Enhancements

**Date**: 2026-03-12
**Status**: Approved
**Scope**: Frontend only — `components/dashboard/rescue-center/`

## Overview

Add a search bar with autocomplete, a filter system, and a live pet creation preview to the rescue center dashboard pets tab.

## 1. Search Bar with Autocomplete

### Placement
- Inline with the dashboard pets tab header
- Search input on the **left**, "Add Pet" button on the **right**, same row

### Behavior
- **Client-side filtering** — pets are already loaded in state, no new API calls
- As the user types, the **grid filters live** to show only matching pets (case-insensitive substring match on pet name)
- A **dropdown appears below the input** showing up to 5-6 matching pet names as a convenience preview of matches
- Clicking a dropdown result selects that pet's name into the search input (grid is already filtered)
- Dropdown dismisses on blur, Escape, or when input is cleared
- Arrow keys navigate dropdown results, Enter selects the highlighted result

### UI
- Standard text input with `faMagnifyingGlass` icon on the left inside the input (note: FA6 renamed `faSearch` to `faMagnifyingGlass`)
- `faFilter` icon on the right inside the input (see Section 2)
- `rounded-xl` on the input (per button/input geometry rule)
- Autocomplete dropdown: `rounded-xl`, appears directly below the input, same width

### Dropdown Mutual Exclusivity
- The autocomplete dropdown and the filter dropdown (Section 2) are **mutually exclusive** — only one can be open at a time
- Typing in the search input closes the filter dropdown if open
- Clicking the filter icon closes the autocomplete dropdown if open

### Files affected
- `components/dashboard/rescue-center/pets-tab.tsx` — add search input to header, autocomplete dropdown, client-side filtering logic

## 2. Filter System

### Trigger
- `faFilter` icon inside the search bar on the **right side**
- Clicking the icon opens a dropdown below the search bar with filter options

### Active State Styling
- When filter dropdown is open OR any filter is active:
  - Filter icon background: `bg-pop-550`
  - Search bar border: `border-pop-550`
- When inactive: default border and icon styling

### Filter Options (multi-select toggles)
| Category | Options |
|----------|---------|
| Especie | Perro, Gato |
| Género | Macho, Hembra |
| Condición | Con condición especial, Sin condición |
| Vacunado | Sí, No |
| Castrado | Sí, No |

- Each option is a toggleable chip/pill
- Multiple selections allowed within and across categories
- Active filters show a badge count on the `faFilter` icon (e.g., small number bubble)
- Filters combine with search — both are applied simultaneously

### Vaccinated / Castrated — UI Only (Greyed Out)
- These filter options render in the UI but are **greyed out / disabled** with a "Próximamente" tooltip
- They become functional once Spec D adds `vaccinated` and `castrated` fields to the `Pet` model
- Wire the filter logic so it's ready to work once the fields exist on the `Pet` interface — just disable the UI toggle for now

### Filter Dropdown UI
- Uses shadcn `DropdownMenu` or a simple positioned `div` below the search bar
- `rounded-xl` container
- Categories separated by labels
- Filter pills/chips within each category

### Files affected
- `components/dashboard/rescue-center/pets-tab.tsx` — add filter dropdown, filter state, combine with search filtering

## 3. Pet Creation Live Preview

### Current
- `AddPetModal` is a standard form modal: name, age, gender, species, description, conditions, photos
- Current modal width: `md:max-w-130`
- No preview of how the pet will look in the grid

### New — Two-Panel Layout

#### Desktop (md+)
- Modal expands wider (`md:max-w-3xl`) to accommodate two panels side by side
- **Left panel**: existing form (unchanged)
- **Right panel**: live preview card that updates in real-time as the user fills in the form
- Preview is always visible — no toggle needed

#### Mobile (below md)
- Form only by default (single panel, current behavior)
- **Toggle button** visible on mobile only (hidden on desktop via `md:hidden`)
- Clicking toggle switches between form view and preview view
- Toggle label: "Vista previa" / "Editar" depending on current view

### Preview Card Contents
- **CardCarousel**: shows uploaded photos with auto-rotate + dots (same as dashboard grid). If no photos uploaded yet, show `faPaw` icon placeholder (matching the dashboard grid empty state in `pets-tab.tsx`)
- **Pet name**: updates as user types (or placeholder "Nombre" if empty)
- **Badges**: species, gender, age — update as user selects/types
- **Condition styling**: if conditions are checked, card gets `bg-amber-50 border-2 border-amber-400` (amber tint + amber border)
- **"Condición especial" badge**: appears if any condition is selected (`bg-amber-100 text-amber-700`)

### Files affected
- `components/dashboard/rescue-center/add-pet-modal.tsx` — expand to two-panel layout, add live preview, add mobile toggle

## i18n

New UI text added to `public/locales/{es,en}/pets.json` under a `dashboard` prefix (keeps all pet-related keys in one namespace):

| Key | Spanish | English |
|-----|---------|---------|
| `dashboard.searchPlaceholder` | Buscar mascota... | Search pet... |
| `dashboard.filter.species` | Especie | Species |
| `dashboard.filter.gender` | Género | Gender |
| `dashboard.filter.conditions` | Condición | Condition |
| `dashboard.filter.withCondition` | Con condición especial | With special condition |
| `dashboard.filter.withoutCondition` | Sin condición | Without condition |
| `dashboard.filter.vaccinated` | Vacunado | Vaccinated |
| `dashboard.filter.castrated` | Castrado | Castrated |
| `dashboard.filter.yes` | Sí | Yes |
| `dashboard.filter.no` | No | No |
| `dashboard.filter.comingSoon` | Próximamente | Coming soon |
| `dashboard.preview` | Vista previa | Preview |
| `dashboard.edit` | Editar | Edit |

## Dependencies

- **Spec A**: Condition card amber tint styling — the preview card reuses the same `bg-amber-50 border-2 border-amber-400` classes. Independent of Spec A implementation order since the classes are explicit here.
- **Spec D (backend)**: `vaccinated` and `castrated` fields on `Pet` model. Until then, those filter options are greyed out with "Próximamente" tooltip.

## Out of Scope
- Backend field additions — Spec D
- `/pets` page filters (already exist) — Spec A
- Onboarding changes — Spec B
