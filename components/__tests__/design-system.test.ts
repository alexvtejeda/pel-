// components/__tests__/design-system.test.ts
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const COMPONENTS_DIR = path.resolve(__dirname, '..')
const ONBOARDING_DIR = path.join(COMPONENTS_DIR, 'auth', 'onboarding')

/** Get all .tsx files under a directory recursively */
function getTsxFiles(dir: string, ignore: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { recursive: true, encoding: 'utf-8' })
  return entries
    .filter((e): e is string => typeof e === 'string' && e.endsWith('.tsx'))
    .filter((e) => !ignore.some((ig) => e.startsWith(ig)))
    .map((e) => path.join(dir, e))
}

/** Glob all .tsx files under components/ excluding ui/ and __tests__/ */
function getCustomComponentFiles(): string[] {
  return getTsxFiles(COMPONENTS_DIR, ['ui/', '__tests__/'])
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
    'paw-silhouettes.tsx',
    'logo.tsx',
    'testimonial-carousel.tsx',
    'about-header.tsx',
    'logo-marquee.tsx',
    'segments-stage.tsx',
    'scene-04-segments.tsx',
    'scene-05-plans.tsx',
    'scene-06-lean-canvas.tsx',
    'form-renderer.tsx',
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
    const wizardFiles = getTsxFiles(ONBOARDING_DIR).filter((f) =>
      path.basename(f).endsWith('-wizard.tsx')
    )
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

  const TARGET_BLANK_ALLOWLIST = [
    'LogoLoop.tsx', // imported from react-bits, not our code
  ]

  it('16 — target="_blank" includes rel="noopener noreferrer"', () => {
    const files = getCustomComponentFiles().filter(
      (f) => !TARGET_BLANK_ALLOWLIST.some((allowed) => f.endsWith(allowed))
    )
    const violations: string[] = []

    for (const file of files) {
      const lines = readLines(file)
      for (let i = 0; i < lines.length; i++) {
        const { line, num } = lines[i]
        if (line.includes('target="_blank"') || line.includes("target='_blank'")) {
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
    const wizardFiles = getTsxFiles(ONBOARDING_DIR).filter((f) =>
      path.basename(f).endsWith('-wizard.tsx')
    )
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

// ─── UI Primitive Radii ──────────────────────────────────────
// components/ui/ is exempt from the generic radius rules above (shadcn ships
// rounded-md/lg defaults), so these three primitives are pinned explicitly —
// they are the root cause of most radius drift in feature code.

describe('UI Primitive Radii', () => {
  const readUi = (file: string) =>
    fs.readFileSync(path.join(COMPONENTS_DIR, 'ui', file), 'utf-8')

  it('21 — Button base variant uses rounded-xl, not rounded-md', () => {
    const content = readUi('button.tsx')
    expect(content).toContain('rounded-xl')
    expect(content).not.toMatch(/\brounded-md\b/)
  })

  it('22 — Card uses rounded-2xl', () => {
    const content = readUi('card.tsx')
    expect(content).toMatch(/"rounded-2xl border bg-card/)
  })

  it('23 — AlertDialogContent uses sm:rounded-2xl', () => {
    const content = readUi('alert-dialog.tsx')
    expect(content).toContain('sm:rounded-2xl')
    expect(content).not.toContain('sm:rounded-lg')
  })
})

// ─── Semantic Status Colors (in-scope routes only) ───────────
// The dashboards still carry raw palette colors and are out of scope for the
// 2026-07-28 UI pass, so this rule is scoped to the audited files rather than
// applied globally.

describe('Semantic Status Colors', () => {
  const IN_SCOPE = [
    'pets/pet-grid.tsx',
    'pets/pet-detail.tsx',
    'pets/user-pet-card.tsx',
    'adopt/adopt-pet-page.tsx',
    'providers/provider-card.tsx',
    'aliados/provider-detail.tsx',
  ]

  it('24 — audited components use success/warning tokens, not raw palette colors', () => {
    const files = IN_SCOPE.map((f) => path.join(COMPONENTS_DIR, f))
    const v = findViolations(files, /\b(bg|text|border)-(amber|green|yellow)-\d/)
    expect(v, `raw palette colors found:\n${v.join('\n')}`).toHaveLength(0)
  })

  it('25 — audited components use Tailwind v4 gradient syntax', () => {
    const files = IN_SCOPE.map((f) => path.join(COMPONENTS_DIR, f))
    const v = findViolations(files, /\bbg-gradient-to-/)
    expect(v, `v3 gradient syntax found:\n${v.join('\n')}`).toHaveLength(0)
  })

  // IN_SCOPE resolves against COMPONENTS_DIR, so the one audited file that lives
  // under app/ would otherwise have no regression cover at all.
  it('26 — audited app/ routes use success/warning tokens too', () => {
    const files = [path.join(COMPONENTS_DIR, '..', 'app', '[lang]', 'servicios', 'page.tsx')]
    const v = findViolations(files, /\b(bg|text|border)-(amber|green|yellow)-\d/)
    expect(v, `raw palette colors found:\n${v.join('\n')}`).toHaveLength(0)
  })
})
