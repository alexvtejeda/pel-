# Design Consistency Tests

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this spec.

**Goal:** Automated tests that enforce Pelu's design system rules across all custom components, catching violations before they ship.

**Approach:** 80/20 split — 20 static analysis tests (scan source files as strings) + 8 lightweight rendered tests (mount simple components, assert DOM classes). All tests run in Vitest.

---

## Scope

- **In scope:** All `.tsx` files under `components/` excluding `components/ui/` (shadcn components are third-party and ship with their own defaults)
- **Out of scope:** shadcn/ui overrides, visual regression testing, screenshot comparison

## File Structure

| File | Purpose |
|------|---------|
| `components/__tests__/design-system.test.ts` | 20 static analysis tests — reads source files as strings |
| `components/__tests__/design-structure.test.tsx` | 8 rendered component tests — mounts components, asserts DOM |
| `components/__tests__/test-utils.tsx` | Shared test wrapper providing i18n + router context |

## Test Utility (`test-utils.tsx`)

A thin render wrapper that provides:
- **i18n:** Initialize i18next with bundled resources (same as `lib/i18n/index.ts`)
- **Router:** Mock `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`)

No auth context or API mocking needed — the rendered tests only target components that don't require them.

---

## Part 1: Static Analysis Tests (20 tests)

Each test globs all `.tsx` files under `components/` (excluding `ui/`), reads them as strings via `fs.readFileSync`, and uses regex to flag violations. On failure, the test reports the exact file path and line number.

**Regex approach:** To handle both static className strings and template literals/`cn()` calls, scan each line independently for the violating pattern rather than trying to match inside a className attribute. This catches `className="rounded-lg ..."`, `` className={`... rounded-lg ...`} ``, and `cn("rounded-lg", ...)`.

### Import Guards (5 tests)

| # | Rule | Pattern | Rationale |
|---|------|---------|-----------|
| 1 | No lucide-react imports | `/from ['"]lucide-react/` | FontAwesome is the only icon library |
| 2 | No other icon libraries | `/from ['"](heroicons\|react-icons\|feather-icons)/` | Same as above |
| 3 | No inline SVG elements | `/<svg[\s>]/` | Icons must come from FontAwesome imports. Out of scope: SVG data URIs and `dangerouslySetInnerHTML` |
| 4 | Carousel.tsx has 'use client' | First line check | Uses hooks + motion/react (client-only) |
| 5 | Stepper.tsx has 'use client' | First line check | Uses hooks + motion/react (client-only) |

### Border Radius Enforcement (3 tests)

All exclude `components/ui/`. The design system mandates `rounded-2xl` for cards and `rounded-xl` for buttons/inputs. `rounded-full` is allowed only for avatars, badges, and status indicators. These three radii should never appear in custom components:

| # | Rule | Pattern |
|---|------|---------|
| 6 | No rounded-lg | `/\brounded-lg\b/` scanned per line |
| 7 | No rounded-md | `/\brounded-md\b/` scanned per line |
| 8 | No rounded-sm | `/\brounded-sm\b/` scanned per line |

**Known violations to fix during implementation:** ~13 custom component files currently use `rounded-lg` or `rounded-md`. These will be corrected to `rounded-xl` or `rounded-2xl` as part of the implementation plan so the tests pass from the start.

### Icon Sizing (1 test)

| # | Rule | Pattern | Rationale |
|---|------|---------|-----------|
| 9 | FontAwesomeIcon never uses w-/h- sizing | Scan lines containing `FontAwesomeIcon` for `/\b[wh]-\d/` pattern | Must use `text-*` classes per CLAUDE.md |

The scan checks each line containing `FontAwesomeIcon` for `w-` or `h-` size tokens, regardless of quoting style (static strings, template literals, `cn()` calls).

### Color & Styling Rules (5 tests)

| # | Rule | Pattern | Rationale |
|---|------|---------|-----------|
| 10 | No inline style={{ }} for colors/spacing | `/style=\{\{/` — allowlist below | Tailwind for styling; dynamic computed values are exceptions |

**Test #10 allowlist** (files with legitimate `style={{}}` for dynamic values that can't be static Tailwind):
- `Carousel.tsx` — transform offsets
- `Stepper.tsx` — motion position/overflow
- `pet-grid.tsx` — drop-shadow filter
- `chat/chat-message-thread.tsx` — animationDelay for typing dots
- `transport/transport-drawer.tsx` — conditional display
- `auth/role-selection.tsx` — dynamic icon color
- `dashboard/rescue-center/forms-tab.tsx` — aspectRatio
- `dashboard/rescue-center/agenda-tab.tsx` — CSS custom property for cell size
- `dashboard/rescue-center/metrics-tab.tsx` — dynamic width percentage
- `dashboard/rescue-center/logo-upload.tsx` — aspectRatio
- `pets/pets-header.tsx` — dynamic maxWidth/opacity
| 11 | No hardcoded hex colors in className | Scan lines with `className` for `/#[0-9a-fA-F]{3,8}\b/` | Use design tokens |
| 12 | No text-gray-* classes | `/\btext-gray-\d/` per line | Use `text-muted-foreground` etc. |
| 13 | No bg-gray-* classes | `/\bbg-gray-\d/` per line | Use `bg-secondary` etc. |
| 14 | No Tailwind v3 opacity syntax | `/\b(bg\|text\|border\|divide\|ring\|placeholder)-opacity-/` per line | Project uses Tailwind v4 (`bg-pop-550/10` syntax) |

### Structural Patterns (3 tests)

| # | Rule | Pattern | Rationale |
|---|------|---------|-----------|
| 15 | All onboarding wizards import OnboardingNav | Check `*-wizard.tsx` files for `OnboardingNav` import | Every wizard needs the breadcrumb header |
| 16 | target="_blank" includes rel="noopener noreferrer" | For each `target="_blank"` occurrence, verify the same JSX element contains `rel="noopener noreferrer"` (check within ±2 lines) | Security best practice |
| 17 | Custom components with React hooks have 'use client' | Files importing any of `useState`, `useEffect`, `useRef`, `useLayoutEffect`, `useCallback`, `useMemo` must start with `'use client'` | Next.js App Router requirement |

### Consistency Rules (2 tests)

| # | Rule | Pattern | Rationale |
|---|------|---------|-----------|
| 18 | Onboarding wizard submit buttons use bg-pop-550 | Scan `*-wizard.tsx` files and verify each contains `bg-pop-550` | Brand-consistent CTA in wizards |
| 19 | No FontAwesomeIcon `size` prop | `/FontAwesomeIcon[^>]*\bsize=/` per line | Must use `text-*` Tailwind classes for sizing, not FA's `size` prop |

**Former test #20 moved to #17** (structural patterns) and expanded to cover all React hook imports.

---

## Part 2: Rendered Component Tests (8 tests)

These mount components with RTL's `render()` inside the test utility wrapper. Only targets components with minimal external dependencies.

### OnboardingNav (3 tests)

**Mocking needed:** `next/navigation` (usePathname, useRouter)

| # | Assertion |
|---|-----------|
| 1 | Renders breadcrumb with all provided items (checks item count) |
| 2 | Current item renders as non-clickable `BreadcrumbPage` |
| 3 | Renders the Pelu logo image |

### Stepper (3 tests)

**Mocking needed:** `motion/react` (mock to passthrough divs — avoids animation complexity)

| # | Assertion |
|---|-----------|
| 4 | Renders step indicator circles matching number of `Step` children |
| 5 | Next button has `rounded-full` and `bg-pop-550` classes (intentional exception to `rounded-xl` rule — Stepper uses pill-style button) |
| 6 | Wrapping card has `rounded-2xl` class |

### PetGrid (2 tests)

**Mocking needed:** `react-i18next` (useTranslation), `next/image` (passthrough)

**Minimal props for render:**
```tsx
<PetGrid
  pets={[]}
  loading={false}
  error={null}
  selectedId={null}
  activeFilter="dogs"
  onSelect={() => {}}
  onFilterChange={() => {}}
  vaccinatedFilter={false}
  castratedFilter={false}
  onVaccinatedChange={() => {}}
  onCastratedChange={() => {}}
/>
```

| # | Assertion |
|---|-----------|
| 7 | Active filter pill (`activeFilter="dogs"`) has `bg-pop-550` class |
| 8 | Inactive filter pills have `bg-background` class |

---

## Implementation Notes

- **Static tests read files with `fs.readFileSync`** — fast, no compilation needed
- **Violations report file:line** — e.g., `"rounded-lg found in components/dashboard/rescue-center/forms-tab.tsx:279"`
- **Border radius fixes** are part of implementation — the ~13 violating custom component files will be updated to use `rounded-xl` or `rounded-2xl` before the tests are committed
- **Test utility** is minimal — just i18n init + router mock, reusable for future component tests
- **All tests run with `bun run test`** via existing Vitest config
- **CLAUDE.md** should be updated to note that Vitest is configured (currently says "No test framework is configured")
