# Design Consistency Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 20 static analysis + 8 rendered tests enforcing Pelú's design system, and fix all existing violations so tests pass from the start.

**Architecture:** Static tests read `.tsx` source files as strings and flag violations with regex. Rendered tests mount 3 lightweight components (OnboardingNav, Stepper, PetGrid) via RTL and assert CSS classes. A shared test utility provides i18n + router mocks.

**Tech Stack:** Vitest, React Testing Library, `fs` + `glob` for static file scanning

**Spec:** `docs/superpowers/specs/2026-03-18-design-consistency-tests.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/__tests__/design-system.test.ts` | Create | 20 static analysis tests |
| `components/__tests__/design-structure.test.tsx` | Create | 8 rendered component tests |
| `components/__tests__/test-utils.tsx` | Create | Shared render wrapper (i18n + router mock) |
| `components/Carousel.tsx` | Modify (line 1) | Add `'use client'` directive |
| `components/Stepper.tsx` | Modify (line 1) | Add `'use client'` directive |
| 13 component files (see Task 1) | Modify | Fix `rounded-lg`/`rounded-md` → `rounded-xl`/`rounded-2xl` |
| `CLAUDE.md` | Modify | Note that Vitest is configured |

---

### Task 1: Fix border radius violations

All `rounded-lg` and `rounded-md` in custom components must be replaced before the static tests are written. Each fix is a simple find-replace on one line.

**Files:**

| File | Line | Old | New | Reason |
|------|------|-----|-----|--------|
| `components/dashboard/rescue-center/forms-tab.tsx` | 279 | `rounded-lg` | `rounded-xl` | button |
| `components/dashboard/rescue-center/settings-tab.tsx` | 282 | `rounded-lg` | `rounded-xl` | badge |
| `components/dashboard/rescue-center/pets-tab.tsx` | 722 | `rounded-lg` | `rounded-xl` | icon button |
| `components/dashboard/rescue-center/interested-tab.tsx` | 131 | `rounded-lg` | `rounded-xl` | thumbnail |
| `components/dashboard/rescue-center/interested-tab.tsx` | 133 | `rounded-lg` | `rounded-xl` | icon container |
| `components/dashboard/rescue-center/interested-tab.tsx` | 308 | `rounded-lg` | `rounded-xl` | file thumbnail |
| `components/dashboard/rescue-center/metrics-tab.tsx` | 300 | `rounded-md` | `rounded-xl` | progress bar |
| `components/dashboard/rescue-center/metrics-tab.tsx` | 302 | `rounded-md` | `rounded-xl` | progress fill |
| `components/dashboard/rescue-center/agenda-tab.tsx` | 75 | `rounded-md` | `rounded-xl` | calendar indicator |
| `components/dashboard/admin/rescue-centers-tab.tsx` | 98 | `rounded-lg` | `rounded-xl` | filter button |
| `components/dashboard/admin/rescue-centers-tab.tsx` | 122 | `rounded-lg` | `rounded-xl` | status badge |
| `components/dashboard/admin/rescue-centers-tab.tsx` | 143 | `rounded-lg` | `rounded-xl` | alert box |
| `components/dashboard/admin/admin-form-tab.tsx` | 215 | `rounded-lg` | `rounded-xl` | button |
| `components/auth/onboarding/rescue-center-wizard.tsx` | 195 | `rounded-lg` | `rounded-2xl` | card container |
| `components/auth/onboarding/rescue-center-wizard.tsx` | 229 | `rounded-lg` | `rounded-2xl` | main content card |
| `components/auth/onboarding/business-wizard.tsx` | 207 | `rounded-lg` | `rounded-2xl` | card container |
| `components/auth/onboarding/business-wizard.tsx` | 240 | `rounded-lg` | `rounded-2xl` | main content card |
| `components/auth/mfa/mfa-enrollment.tsx` | 108 | `rounded-lg` | `rounded-xl` | badge |
| `components/auth/rescue-center-guard.tsx` | 67 | `rounded-lg` | `rounded-2xl` | card container |
| `components/auth/rescue-center-guard.tsx` | 91 | `rounded-lg` | `rounded-2xl` | card container |
| `components/theme-toggle.tsx` | 18 | `rounded-md` | `rounded-xl` | toggle button |

- [ ] **Step 1:** Fix all 9 dashboard files (forms-tab, settings-tab, pets-tab, interested-tab, metrics-tab, agenda-tab, rescue-centers-tab, admin-form-tab). Replace `rounded-lg` → `rounded-xl` and `rounded-md` → `rounded-xl` at the exact lines listed above.

- [ ] **Step 2:** Fix wizard/auth files (rescue-center-wizard, business-wizard, rescue-center-guard). Replace `rounded-lg` → `rounded-2xl` at the exact lines listed above (these are card containers).

- [ ] **Step 3:** Fix remaining files (mfa-enrollment `rounded-lg` → `rounded-xl`, theme-toggle `rounded-md` → `rounded-xl`).

- [ ] **Step 4:** Add `'use client'` as the first line of `components/Carousel.tsx` and `components/Stepper.tsx` (both use React hooks + motion/react but lack the directive).

- [ ] **Step 5:** Run `bun run dev` build check — verify no errors in terminal.

- [ ] **Step 6:** Commit

```bash
git add components/
git commit -m "fix: update border radius to match design system (rounded-xl/2xl)

Replace rounded-lg and rounded-md with rounded-xl (buttons/badges)
or rounded-2xl (cards/containers) across 13 custom component files.
Add 'use client' directive to Carousel.tsx and Stepper.tsx."
```

---

### Task 2: Create test utility

**Files:**
- Create: `components/__tests__/test-utils.tsx`

- [ ] **Step 1:** Create the test utility file with i18n + router mocking:

```tsx
// components/__tests__/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'

// Mock next/navigation before any component imports
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/image to a simple img tag
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, priority, ...rest } = props
    return <img {...rest} />
  },
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestWrapper, ...options })
}
```

- [ ] **Step 2:** Verify it compiles — run `npx vitest run --passWithNoTests components/__tests__/test-utils.tsx`

- [ ] **Step 3:** Commit

```bash
git add components/__tests__/test-utils.tsx
git commit -m "test: add shared test utility with i18n + router mocks"
```

---

### Task 3: Write static analysis tests (20 tests)

**Files:**
- Create: `components/__tests__/design-system.test.ts`

This is one file with 20 tests organized in `describe` blocks. Each test globs `.tsx` files under `components/` (excluding `ui/`), reads them as strings, and flags violations.

- [ ] **Step 1:** Write the complete static analysis test file:

```ts
// components/__tests__/design-system.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { globSync } from 'glob'

const COMPONENTS_DIR = path.resolve(__dirname, '..')
const ONBOARDING_DIR = path.join(COMPONENTS_DIR, 'auth', 'onboarding')

/** Glob all .tsx files under components/ excluding ui/ and __tests__/ */
function getCustomComponentFiles(): string[] {
  return globSync('**/*.tsx', {
    cwd: COMPONENTS_DIR,
    absolute: true,
    ignore: ['ui/**', '__tests__/**'],
  })
}

/** Read file and return lines with 1-based line numbers */
function readLines(filePath: string): { line: string; num: number }[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.split('\n').map((line, i) => ({ line, num: i + 1 }))
}

/** Find violations: returns array of "file:line — content" strings */
function findViolations(
  files: string[],
  pattern: RegExp
): string[] {
  const violations: string[] = []
  for (const file of files) {
    const lines = readLines(file)
    for (const { line, num } of lines) {
      if (pattern.test(line)) {
        const rel = path.relative(COMPONENTS_DIR, file)
        violations.push(`${rel}:${num} — ${line.trim()}`)
      }
    }
  }
  return violations
}

// ─── Import Guards ───────────────────────────────────────────

describe('Import Guards', () => {
  const files = getCustomComponentFiles()

  it('1 — no lucide-react imports', () => {
    const v = findViolations(files, /from\s+['"]lucide-react/)
    expect(v, `lucide-react imports found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('2 — no other icon library imports', () => {
    const v = findViolations(files, /from\s+['"](heroicons|react-icons|feather-icons)/)
    expect(v, `non-FA icon imports found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('3 — no inline SVG elements', () => {
    const v = findViolations(files, /<svg[\s>]/)
    expect(v, `inline SVGs found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('4 — Carousel.tsx has use client directive', () => {
    const content = fs.readFileSync(
      path.join(COMPONENTS_DIR, 'Carousel.tsx'),
      'utf-8'
    )
    expect(content.startsWith("'use client'")).toBe(true)
  })

  it('5 — Stepper.tsx has use client directive', () => {
    const content = fs.readFileSync(
      path.join(COMPONENTS_DIR, 'Stepper.tsx'),
      'utf-8'
    )
    expect(content.startsWith("'use client'")).toBe(true)
  })
})

// ─── Border Radius Enforcement ───────────────────────────────

describe('Border Radius Enforcement', () => {
  const files = getCustomComponentFiles()

  it('6 — no rounded-lg in custom components', () => {
    const v = findViolations(files, /\brounded-lg\b/)
    expect(v, `rounded-lg found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('7 — no rounded-md in custom components', () => {
    const v = findViolations(files, /\brounded-md\b/)
    expect(v, `rounded-md found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('8 — no rounded-sm in custom components', () => {
    const v = findViolations(files, /\brounded-sm\b/)
    expect(v, `rounded-sm found:\n${v.join('\n')}`).toHaveLength(0)
  })
})

// ─── Icon Sizing ─────────────────────────────────────────────

describe('Icon Sizing', () => {
  const files = getCustomComponentFiles()

  it('9 — FontAwesomeIcon never uses w-/h- sizing', () => {
    const violations: string[] = []
    for (const file of files) {
      const lines = readLines(file)
      for (const { line, num } of lines) {
        if (line.includes('FontAwesomeIcon') && /\b[wh]-\d/.test(line)) {
          const rel = path.relative(COMPONENTS_DIR, file)
          violations.push(`${rel}:${num} — ${line.trim()}`)
        }
      }
    }
    expect(violations, `FA icons with w-/h- sizing:\n${violations.join('\n')}`).toHaveLength(0)
  })
})

// ─── Color & Styling Rules ───────────────────────────────────

describe('Color & Styling Rules', () => {
  const files = getCustomComponentFiles()

  const STYLE_ALLOWLIST = [
    'Carousel.tsx',
    'Stepper.tsx',
    'pet-grid.tsx',
    'chat-message-thread.tsx',
    'transport-drawer.tsx',
    'role-selection.tsx',
    'forms-tab.tsx',
    'agenda-tab.tsx',
    'metrics-tab.tsx',
    'logo-upload.tsx',
    'pets-header.tsx',
  ]

  it('10 — no inline style={{}} except allowlisted files', () => {
    const filtered = files.filter(
      (f) => !STYLE_ALLOWLIST.some((allowed) => f.endsWith(allowed))
    )
    const v = findViolations(filtered, /style=\{\{/)
    expect(v, `inline style={{}} found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('11 — no hardcoded hex colors in className', () => {
    const violations: string[] = []
    for (const file of files) {
      const lines = readLines(file)
      for (const { line, num } of lines) {
        if (line.includes('className') && /#[0-9a-fA-F]{3,8}\b/.test(line)) {
          const rel = path.relative(COMPONENTS_DIR, file)
          violations.push(`${rel}:${num} — ${line.trim()}`)
        }
      }
    }
    expect(violations, `hex colors in className:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('12 — no text-gray-* classes', () => {
    const v = findViolations(files, /\btext-gray-\d/)
    expect(v, `text-gray-* found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('13 — no bg-gray-* classes', () => {
    const v = findViolations(files, /\bbg-gray-\d/)
    expect(v, `bg-gray-* found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('14 — no Tailwind v3 opacity syntax', () => {
    const v = findViolations(
      files,
      /\b(bg|text|border|divide|ring|placeholder)-opacity-/
    )
    expect(v, `Tailwind v3 opacity syntax found:\n${v.join('\n')}`).toHaveLength(0)
  })
})

// ─── Structural Patterns ─────────────────────────────────────

describe('Structural Patterns', () => {
  it('15 — all onboarding wizards import OnboardingNav', () => {
    const wizardFiles = globSync('*-wizard.tsx', {
      cwd: ONBOARDING_DIR,
      absolute: true,
    })
    expect(wizardFiles.length).toBeGreaterThan(0)

    const missing: string[] = []
    for (const file of wizardFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('OnboardingNav')) {
        missing.push(path.basename(file))
      }
    }
    expect(missing, `wizards missing OnboardingNav:\n${missing.join('\n')}`).toHaveLength(0)
  })

  it('16 — target="_blank" includes rel="noopener noreferrer"', () => {
    const files = getCustomComponentFiles()
    const violations: string[] = []

    for (const file of files) {
      const lines = readLines(file)
      for (let i = 0; i < lines.length; i++) {
        const { line, num } = lines[i]
        if (line.includes('target="_blank"') || line.includes("target='_blank'")) {
          // Check current line and next 2 lines for rel attribute
          const window = lines
            .slice(i, i + 3)
            .map((l) => l.line)
            .join(' ')
          if (!window.includes('rel="noopener noreferrer"') && !window.includes("rel='noopener noreferrer'")) {
            const rel = path.relative(COMPONENTS_DIR, file)
            violations.push(`${rel}:${num} — ${line.trim()}`)
          }
        }
      }
    }
    expect(violations, `target="_blank" without rel:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('17 — custom components with React hooks have use client', () => {
    const files = getCustomComponentFiles()
    const hookPattern = /import\s+\{[^}]*(useState|useEffect|useRef|useLayoutEffect|useCallback|useMemo)[^}]*\}\s+from\s+['"]react['"]/
    const violations: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      if (hookPattern.test(content) && !content.startsWith("'use client'")) {
        violations.push(path.relative(COMPONENTS_DIR, file))
      }
    }
    expect(violations, `files with hooks missing 'use client':\n${violations.join('\n')}`).toHaveLength(0)
  })
})

// ─── Consistency Rules ───────────────────────────────────────

describe('Consistency Rules', () => {
  it('18 — onboarding wizard submit buttons use bg-pop-550', () => {
    const wizardFiles = globSync('*-wizard.tsx', {
      cwd: ONBOARDING_DIR,
      absolute: true,
    })
    const missing: string[] = []
    for (const file of wizardFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (!content.includes('bg-pop-550')) {
        missing.push(path.basename(file))
      }
    }
    expect(missing, `wizards without bg-pop-550 CTA:\n${missing.join('\n')}`).toHaveLength(0)
  })

  it('19 — no FontAwesomeIcon size prop', () => {
    const files = getCustomComponentFiles()
    const violations: string[] = []
    for (const file of files) {
      const lines = readLines(file)
      for (const { line, num } of lines) {
        if (line.includes('FontAwesomeIcon') && /\bsize=/.test(line)) {
          const rel = path.relative(COMPONENTS_DIR, file)
          violations.push(`${rel}:${num} — ${line.trim()}`)
        }
      }
    }
    expect(violations, `FA size prop used:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('20 — error containers use bg-destructive pattern consistently', () => {
    const files = getCustomComponentFiles()
    const violations: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // Files that render error UI (contain "error" or "destructive" in className context)
      // should use bg-destructive/10, not bg-red-* or other error colors
      const lines = readLines(file)
      for (const { line, num } of lines) {
        if (/\bbg-red-\d/.test(line)) {
          const rel = path.relative(COMPONENTS_DIR, file)
          violations.push(`${rel}:${num} — ${line.trim()} (use bg-destructive instead of bg-red-*)`)
        }
      }
    }
    expect(violations, `non-standard error colors:\n${violations.join('\n')}`).toHaveLength(0)
  })
})
```

- [ ] **Step 2:** Run all static tests:

```bash
npx vitest run components/__tests__/design-system.test.ts
```

Expected: All 20 tests pass (since Task 1 already fixed the violations).

- [ ] **Step 3:** If any tests fail, fix the remaining violations in the component files, then re-run.

- [ ] **Step 4:** Commit

```bash
git add components/__tests__/design-system.test.ts
git commit -m "test: add 20 static analysis tests for design system enforcement"
```

---

### Task 4: Write rendered component tests (8 tests)

**Files:**
- Create: `components/__tests__/design-structure.test.tsx`

**Mocking strategy:**
- `motion/react` — mock to passthrough divs (avoids animation complexity)
- `next/navigation` — provided by test-utils
- `next/image` — provided by test-utils
- `react-i18next` — provided by test-utils via I18nextProvider

- [ ] **Step 1:** Write the rendered component test file:

```tsx
// components/__tests__/design-structure.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

// Mock motion/react before component imports
// Stepper.tsx imports: motion, AnimatePresence, Variants (type-only — no runtime mock needed)
vi.mock('motion/react', () => {
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_target: unknown, prop: string) =>
        React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
          const { initial, animate, exit, variants, transition, whileHover,
            whileTap, onAnimationComplete, layout, ...rest } = props
          return React.createElement(prop, { ...rest, ref })
        }),
    }
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: () => ({ get: () => 0, set: () => {} }),
    useTransform: () => ({ get: () => 0 }),
  }
})

import { renderWithProviders } from './test-utils'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
import Stepper, { Step } from '@/components/Stepper'
import { PetGrid } from '@/components/pets/pet-grid'

// ─── OnboardingNav ───────────────────────────────────────────

describe('OnboardingNav', () => {
  const items = [
    { label: 'Inicio', href: '/' },
    { label: 'Registro', href: '/auth/register' },
    { label: 'Mi perfil', current: true },
  ]

  it('1 — renders breadcrumb with all provided items', () => {
    renderWithProviders(<OnboardingNav items={items} />)
    expect(screen.getByText('Inicio')).toBeDefined()
    expect(screen.getByText('Registro')).toBeDefined()
    expect(screen.getByText('Mi perfil')).toBeDefined()
  })

  it('2 — current item is not a clickable button', () => {
    renderWithProviders(<OnboardingNav items={items} />)
    const currentItem = screen.getByText('Mi perfil')
    // BreadcrumbPage renders as <span> or plain text, not <button>
    expect(currentItem.closest('button')).toBeNull()
  })

  it('3 — renders the Pelú logo', () => {
    renderWithProviders(<OnboardingNav items={items} />)
    const logo = screen.getByAltText(/pel[uú]/i)
    expect(logo).toBeDefined()
  })
})

// ─── Stepper ─────────────────────────────────────────────────

describe('Stepper', () => {
  function renderStepper() {
    return renderWithProviders(
      <Stepper onFinalStepCompleted={() => {}}>
        <Step>Step 1 content</Step>
        <Step>Step 2 content</Step>
        <Step>Step 3 content</Step>
      </Stepper>
    )
  }

  it('4 — renders step indicator circles matching Step children count', () => {
    const { container } = renderStepper()
    // Step circles have the class rounded-full and h-8 w-8
    const circles = container.querySelectorAll('.rounded-full.h-8.w-8')
    expect(circles.length).toBe(3)
  })

  it('5 — next button has rounded-full and bg-pop-550', () => {
    const { container } = renderStepper()
    const nextBtn = container.querySelector('button.rounded-full.bg-pop-550')
    expect(nextBtn).not.toBeNull()
  })

  it('6 — wrapping card has rounded-2xl', () => {
    const { container } = renderStepper()
    const card = container.querySelector('.rounded-2xl')
    expect(card).not.toBeNull()
  })
})

// ─── PetGrid ─────────────────────────────────────────────────

describe('PetGrid', () => {
  const defaultProps = {
    pets: [],
    loading: false,
    error: null,
    selectedId: null,
    activeFilter: 'dogs' as const,
    onSelect: () => {},
    onFilterChange: () => {},
    vaccinatedFilter: false,
    castratedFilter: false,
    onVaccinatedChange: () => {},
    onCastratedChange: () => {},
  }

  it('7 — active filter pill has bg-pop-550 class', () => {
    const { container } = renderWithProviders(<PetGrid {...defaultProps} />)
    const activePill = container.querySelector('.bg-pop-550')
    expect(activePill).not.toBeNull()
    // Should contain the dogs filter text
    expect(activePill!.textContent).toBeTruthy()
  })

  it('8 — inactive filter pills have bg-background class', () => {
    const { container } = renderWithProviders(<PetGrid {...defaultProps} />)
    const inactivePills = container.querySelectorAll('button.bg-background')
    // "all", "cats", "males", "females", "nearby" = 5 inactive + vaccinated, castrated, centers, members = 9 total
    expect(inactivePills.length).toBeGreaterThanOrEqual(5)
  })
})
```

- [ ] **Step 2:** Run the rendered tests:

```bash
npx vitest run components/__tests__/design-structure.test.tsx
```

Expected: All 8 tests pass.

- [ ] **Step 3:** If any tests fail, debug and fix (likely mock issues). Common fixes:
  - If OnboardingNav logo test fails: check the exact `alt` text in `logo.tsx`
  - If Stepper circle selector fails: inspect the actual DOM classes with `container.innerHTML`
  - If PetGrid fails: ensure i18n `pets` namespace has `grid.dogs` key

- [ ] **Step 4:** Commit

```bash
git add components/__tests__/design-structure.test.tsx
git commit -m "test: add 8 rendered component tests for design structure"
```

---

### Task 5: Run full test suite and update CLAUDE.md

- [ ] **Step 1:** Run the entire test suite to verify nothing is broken:

```bash
npx vitest run
```

Expected: All tests pass (existing 156 API/util tests + new 28 design tests = 184 total).

- [ ] **Step 2:** Update `CLAUDE.md` to note Vitest is configured. Change the line that says "No test framework is configured in this project." to:

```markdown
**Testing**: Vitest + React Testing Library. Run `npx vitest run` for all tests, or `npx vitest run path/to/file.test.ts` for a specific file.
```

- [ ] **Step 3:** Commit

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to document Vitest test setup"
```
