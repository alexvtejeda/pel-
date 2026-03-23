# i18n: Replace hardcoded strings with translation keys

## Tasks
- [x] Add new keys to `public/locales/es/pets.json` (tabs, agenda, admin, forms, adopt sections)
- [x] Add new keys to `public/locales/en/pets.json` (matching English translations)
- [x] Add new keys to `public/locales/es/common.json` (time ago, transport)
- [x] Add new keys to `public/locales/en/common.json` (matching English translations)
- [x] Update `notifications-tab.tsx` — time ago function + empty state
- [x] Update `agenda-tab.tsx` — type labels, dates, empty states, calendar locale
- [x] Update `mobile-bottom-nav.tsx` — nav item labels + "Más"
- [x] Update `dashboard-shell.tsx` — tab titles + unsaved changes dialog
- [x] Update `admin-sidebar.tsx` — nav labels + "Admin" badge
- [x] Update `admin-mobile-nav.tsx` — nav labels
- [x] Update `admin-dashboard-shell.tsx` — tab titles
- [x] Update `rescue-centers-tab.tsx` — status labels, actions, delete dialog
- [x] Update `admin-form-tab.tsx` — edit/preview, save, unsaved dialog, error states
- [x] Update `forms-tab.tsx` — edit/preview, save, create form, unsaved dialog
- [x] Update `form-builder.tsx` — field types, placeholders, options, follow-ups, sections, toolbar
- [x] Update `form-renderer.tsx` — validation, submit, success state, file upload, dropdown
- [x] Update `adopt-pet-page.tsx` — back link, advisory banner, error message
- [x] Update `pets-header.tsx` — "Admin" and "Transporte" links

## Review

### Summary
Replaced all hardcoded Spanish text across 14 components with `useTranslation()` calls from react-i18next. Added ~120 new translation keys to the `pets` namespace (organized into `tabs`, `agenda`, `admin`, `forms`, `adopt` sub-sections) and ~6 keys to `common` namespace (time formatting, transport label).

### Key decisions
- **No new namespace**: All new keys fit into existing `pets.json` and `common.json` — avoids needing to register a new namespace in `lib/i18n/index.ts`
- **Calendar locale**: `agenda-tab.tsx` now switches between `es` and `enUS` locale for react-day-picker, and uses the language for `toLocaleDateString`/`toLocaleTimeString` calls
- **`label` → `labelKey` pattern**: Navigation arrays (`navItems`, `FIELD_TYPES`, etc.) now store i18n keys instead of hardcoded strings, resolved at render time via `t()`
- **`timeAgo` → `useTimeAgo` hook**: Converted the standalone function to a hook so it can access `useTranslation` for time formatting

### Files changed
- `public/locales/es/pets.json` — added tabs, agenda, admin, forms, adopt keys
- `public/locales/en/pets.json` — matching English translations
- `public/locales/es/common.json` — added time.*, transport
- `public/locales/en/common.json` — matching English translations
- 14 component files in `components/dashboard/`, `components/forms/`, `components/adopt/`, `components/pets/`

### Verified
- `npx tsc --noEmit` passes with zero new errors
