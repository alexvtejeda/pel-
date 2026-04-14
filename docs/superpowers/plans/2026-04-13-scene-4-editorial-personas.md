# Scene 4 Editorial Personas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scene 4's radial empathy map with a pinned editorial experience where three personas take the stage in turn — character illustration on the left, six quadrant beats cycling on the right, with circle-mask color transitions originating from the incoming character.

**Architecture:** A new `SegmentsStage` component renders three absolutely-stacked persona groups plus a three-layer background stack. A single GSAP ScrollTrigger pins the scene for `+=600%` and drives one master timeline with 18 labels: 6 quadrant beats per segment × 3 segments, with segment transitions overlapping the incoming persona's first quadrant. Background color swaps via `clip-path: circle()` whose radius is tweened as a CSS custom property.

**Tech Stack:** Next.js 16 + React 19, GSAP 3 + ScrollTrigger (already registered), CSS modules with custom-property-driven clip-path, Vitest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-04-13-scene-4-editorial-personas-design.md`

---

## File Structure

**New files:**
- `components/about/segments-stage.tsx` — desktop pinned-scene component. Renders the bg-stack, three persona groups, wires the GSAP timeline and resize handler. ~230 lines.
- `components/about/segments-stage.module.css` — CSS module for bg-layer clip-path (custom properties), scene chrome positioning, quadrant viewport overflow/height, and the style blocks the allowlist would otherwise block.
- `components/__tests__/about/segments-stage.test.tsx` — structural unit tests.

**Modified files:**
- `lib/about/empathy-content.ts` — add `QUADRANT_ORDER` constant. No other changes.
- `components/about/scenes/scene-04-segments.tsx` — becomes thin. Branches on `isDesktop && !reduced`, mounts `<SegmentsStage />` on desktop, renders stacked mobile fallback otherwise. Drops the `EmpathyMap` import and the old pinned timeline.

**Deleted files:**
- `components/about/empathy-map.tsx`
- `components/__tests__/about/empathy-map.test.tsx`
- `'empathy-map.tsx'` entry in the allowlist array at `components/__tests__/design-system.test.ts:146`.

---

## Task 1: Add QUADRANT_ORDER constant

**Files:**
- Modify: `lib/about/empathy-content.ts`
- Create: `components/__tests__/about/empathy-content.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/about/empathy-content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { QUADRANT_ORDER, EMPATHY_SEGMENTS } from '@/lib/about/empathy-content'

describe('QUADRANT_ORDER', () => {
  it('lists all 6 quadrant keys in narrative order', () => {
    expect(QUADRANT_ORDER).toEqual(['piensa', 've', 'oye', 'dice', 'duele', 'aspira'])
  })

  it('every segment has a quadrant for each key in QUADRANT_ORDER', () => {
    for (const segment of EMPATHY_SEGMENTS) {
      for (const key of QUADRANT_ORDER) {
        expect(segment.quadrants[key]).toBeDefined()
        expect(segment.quadrants[key].label).toBeTruthy()
        expect(segment.quadrants[key].body).toBeTruthy()
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/empathy-content.test.ts`
Expected: FAIL — `QUADRANT_ORDER` is not exported from `empathy-content.ts`.

- [ ] **Step 3: Add QUADRANT_ORDER export to `lib/about/empathy-content.ts`**

Add this line immediately above the `export const EMPATHY_SEGMENTS` line:

```ts
export const QUADRANT_ORDER = ['piensa', 've', 'oye', 'dice', 'duele', 'aspira'] as const
```

Do not modify anything else in the file.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/about/empathy-content.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/about/empathy-content.ts components/__tests__/about/empathy-content.test.ts
git commit -m "feat(about): add QUADRANT_ORDER constant to empathy content"
```

---

## Task 2: CSS module for SegmentsStage

**Files:**
- Create: `components/about/segments-stage.module.css`

- [ ] **Step 1: Write the CSS module**

Create `components/about/segments-stage.module.css` with this exact content:

```css
.scene {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.bgStack {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.bgLayer {
  position: absolute;
  inset: 0;
  clip-path: circle(var(--mask-radius, 0%) at var(--mask-origin, 50% 50%));
  will-change: clip-path;
}

.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 4rem 2rem 0 2rem;
  z-index: 10;
  color: var(--primary-foreground);
}

.overline {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.6;
  margin: 0 0 0.5rem 0;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--primary-foreground);
}

@media (min-width: 768px) {
  .title {
    font-size: 2.25rem;
  }
}

.segment {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  color: var(--primary-foreground);
}

.segmentInner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 3rem;
  width: 100%;
}

.characterCol {
  display: flex;
  flex-direction: column;
  align-items: center;
  will-change: transform;
}

.marker {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  opacity: 0.7;
  margin: 0 0 1rem 0;
  color: var(--primary-foreground);
}

.character {
  width: 20rem;
  height: 20rem;
  object-fit: contain;
}

.personaName {
  margin: 1rem 0 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-foreground);
}

.quadrantViewport {
  overflow: hidden;
  height: 12rem;
  display: flex;
  align-items: center;
}

.quadrantStack {
  display: flex;
  flex-direction: column;
  width: 100%;
  will-change: transform;
}

.quadrant {
  height: 12rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
}

.quadrantLabel {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  opacity: 0.85;
}

.quadrantBody {
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/segments-stage.module.css
git commit -m "feat(about): add segments-stage css module"
```

---

## Task 3: SegmentsStage component — static DOM structure (no GSAP yet)

**Files:**
- Create: `components/about/segments-stage.tsx`
- Create: `components/__tests__/about/segments-stage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/about/segments-stage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SegmentsStage } from '@/components/about/segments-stage'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'

beforeEach(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
  // @ts-expect-error jsdom stub
  window.IntersectionObserver = MockIntersectionObserver
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('min-width: 768px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('SegmentsStage — structure', () => {
  it('renders three segment groups with data-segment attributes', () => {
    const { container } = render(<SegmentsStage />)
    const groups = container.querySelectorAll('[data-segment]')
    expect(groups).toHaveLength(3)
    expect(groups[0]).toHaveAttribute('data-segment', 'a')
    expect(groups[1]).toHaveAttribute('data-segment', 'b')
    expect(groups[2]).toHaveAttribute('data-segment', 'c')
  })

  it('renders the segment marker (A / B / C) for each segment', () => {
    render(<SegmentsStage />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('renders personaName, age for every segment', () => {
    render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      expect(screen.getByText(`${seg.personaName}, ${seg.age}`)).toBeInTheDocument()
    }
  })

  it('renders a character image with personaName as alt for every segment', () => {
    render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      const imgs = screen.getAllByAltText(seg.personaName)
      expect(imgs.length).toBeGreaterThan(0)
    }
  })

  it('renders all six quadrants inside each segment in QUADRANT_ORDER', () => {
    const { container } = render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      const group = container.querySelector(`[data-segment="${seg.id}"]`)
      expect(group).not.toBeNull()
      const stack = group!.querySelector('[data-quadrant-stack]')
      expect(stack).not.toBeNull()
      const quadrants = stack!.querySelectorAll('[data-quadrant]')
      expect(quadrants).toHaveLength(6)
      QUADRANT_ORDER.forEach((key, i) => {
        expect(quadrants[i]).toHaveAttribute('data-quadrant', key)
        expect(quadrants[i].textContent).toContain(seg.quadrants[key].label)
        expect(quadrants[i].textContent).toContain(seg.quadrants[key].body)
      })
    }
  })

  it('renders three background layers with correct colorVar', () => {
    const { container } = render(<SegmentsStage />)
    const bgLayers = container.querySelectorAll('[data-bg]')
    expect(bgLayers).toHaveLength(3)
    EMPATHY_SEGMENTS.forEach((seg, i) => {
      expect(bgLayers[i]).toHaveAttribute('data-bg', seg.id)
      expect((bgLayers[i] as HTMLElement).style.backgroundColor).toBeTruthy()
    })
  })

  it('renders the scene overline and title in the header', () => {
    render(<SegmentsStage />)
    expect(screen.getByText(/A quién servimos/i)).toBeInTheDocument()
    expect(screen.getByText(/Tres segmentos, tres historias/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/segments-stage.test.tsx`
Expected: FAIL — module `@/components/about/segments-stage` does not exist.

- [ ] **Step 3: Create `components/about/segments-stage.tsx` (static DOM only, no GSAP yet)**

```tsx
'use client'

import Image from 'next/image'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'
import styles from './segments-stage.module.css'

export function SegmentsStage() {
  return (
    <section data-scene="04-segments" className={styles.scene}>
      <div className={styles.bgStack}>
        {EMPATHY_SEGMENTS.map((seg, i) => (
          <div
            key={seg.id}
            data-bg={seg.id}
            className={styles.bgLayer}
            style={{
              backgroundColor: seg.colorVar,
              // Segment A is the initial full-coverage layer; B and C start hidden.
              ['--mask-radius' as string]: i === 0 ? '200%' : '0%',
              ['--mask-origin' as string]: '50% 50%',
            }}
          />
        ))}
      </div>

      <header className={styles.header}>
        <p className={styles.overline}>A quién servimos</p>
        <h2 className={styles.title}>Tres segmentos, tres historias</h2>
      </header>

      {EMPATHY_SEGMENTS.map((seg) => (
        <div key={seg.id} data-segment={seg.id} className={styles.segment}>
          <div className={styles.segmentInner}>
            <div data-character-col className={styles.characterCol}>
              <p className={styles.marker}>{seg.id.toUpperCase()}</p>
              <Image
                src={seg.character}
                alt={seg.personaName}
                width={320}
                height={320}
                className={styles.character}
              />
              <p className={styles.personaName}>
                {seg.personaName}, {seg.age}
              </p>
            </div>
            <div className={styles.quadrantViewport}>
              <div data-quadrant-stack className={styles.quadrantStack}>
                {QUADRANT_ORDER.map((key) => {
                  const q = seg.quadrants[key]
                  return (
                    <div key={key} data-quadrant={key} className={styles.quadrant}>
                      <p className={styles.quadrantLabel}>{q.label}</p>
                      <p className={styles.quadrantBody}>{q.body}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: Run structural tests to verify they pass**

Run: `npx vitest run components/__tests__/about/segments-stage.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add components/about/segments-stage.tsx components/__tests__/about/segments-stage.test.tsx
git commit -m "feat(about): add SegmentsStage component with static persona structure"
```

---

## Task 4: GSAP timeline — quadrant beats and segment transitions

**Files:**
- Modify: `components/about/segments-stage.tsx`

- [ ] **Step 1: Replace `components/about/segments-stage.tsx` with the full GSAP-driven version**

The structural DOM stays identical; wrap it in a component with refs and the pinned GSAP timeline:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'
import styles from './segments-stage.module.css'

const BEATS_PER_SEGMENT = 6

export function SegmentsStage() {
  const sceneRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced) return
    const sceneEl = sceneRef.current
    if (!sceneEl) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      if (cancelled) return

      const segmentEls = Array.from(sceneEl.querySelectorAll('[data-segment]')) as HTMLElement[]
      const bgEls = Array.from(sceneEl.querySelectorAll('[data-bg]')) as HTMLElement[]

      // Compute char-center as "X% Y%" string relative to the scene root.
      const getCharCenter = (segmentEl: HTMLElement) => {
        const charEl = segmentEl.querySelector('[data-character-col]') as HTMLElement | null
        if (!charEl) return '50% 50%'
        const rect = charEl.getBoundingClientRect()
        const parentRect = sceneEl.getBoundingClientRect()
        const x = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) * 100
        const y = ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height) * 100
        return `${x}% ${y}%`
      }

      // Seed mask origins for each bg layer from its matching segment's char-center.
      segmentEls.forEach((seg, i) => {
        bgEls[i].style.setProperty('--mask-origin', getCharCenter(seg))
      })

      // Seed character positions: A visible at center, B and C off-stage right.
      gsap.set(segmentEls[0].querySelector('[data-character-col]'), { xPercent: 0 })
      gsap.set(segmentEls[1].querySelector('[data-character-col]'), { xPercent: 120 })
      gsap.set(segmentEls[2].querySelector('[data-character-col]'), { xPercent: 120 })

      // Seed segment opacity: A visible, B/C hidden until their transition.
      gsap.set(segmentEls[0], { autoAlpha: 1 })
      gsap.set(segmentEls[1], { autoAlpha: 0 })
      gsap.set(segmentEls[2], { autoAlpha: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start: 'top top',
          end: '+=600%',
          pin: true,
          scrub: 1,
        },
      })

      // Build each segment's quadrant beats: the stack translates -100% per beat.
      const addQuadrantBeats = (segIndex: number, startLabel: number) => {
        const stackEl = segmentEls[segIndex].querySelector('[data-quadrant-stack]')
        for (let i = 1; i < BEATS_PER_SEGMENT; i++) {
          tl.to(
            stackEl,
            { yPercent: -100 * i, duration: 0.6, ease: 'power2.inOut' },
            startLabel + i - 1 + 0.2,
          )
        }
      }

      // Build a segment→next transition starting at the given label.
      const addTransition = (outIndex: number, inIndex: number, startLabel: number) => {
        const outChar = segmentEls[outIndex].querySelector('[data-character-col]')
        const inChar = segmentEls[inIndex].querySelector('[data-character-col]')
        const inBg = bgEls[inIndex]

        tl.to(outChar, { xPercent: -120, duration: 0.6, ease: 'power2.in' }, startLabel)
        tl.to(segmentEls[outIndex], { autoAlpha: 0, duration: 0.3 }, startLabel + 0.3)
        tl.set(segmentEls[inIndex], { autoAlpha: 1 }, startLabel + 0.1)
        tl.fromTo(
          inChar,
          { xPercent: 120 },
          { xPercent: 0, duration: 0.6, ease: 'power2.out' },
          startLabel + 0.1,
        )
        // Custom-property tween: GSAP CSSPlugin interpolates the --mask-radius
        // string as a plain percentage. Do NOT use calc() or any non-percentage
        // value here — CSSPlugin cannot interpolate those.
        tl.to(
          inBg,
          { ['--mask-radius' as string]: '200%', duration: 0.8, ease: 'power2.out' },
          startLabel + 0.15,
        )
      }

      // Segment A beats: labels 0..5 (piensa is the starting state; beats 1..5 slide)
      addQuadrantBeats(0, 0)
      // A → B transition at label 6
      addTransition(0, 1, 6)
      // Segment B beats: labels 6..11
      addQuadrantBeats(1, 6)
      // B → C transition at label 12
      addTransition(1, 2, 12)
      // Segment C beats: labels 12..17
      addQuadrantBeats(2, 12)

      // Debounced resize: refresh char-centers and ScrollTrigger if changed.
      const prevCenters = segmentEls.map((seg) => getCharCenter(seg))
      let resizeTimer: ReturnType<typeof setTimeout> | undefined
      const onResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          let changed = false
          segmentEls.forEach((seg, i) => {
            const next = getCharCenter(seg)
            if (next !== prevCenters[i]) {
              bgEls[i].style.setProperty('--mask-origin', next)
              prevCenters[i] = next
              changed = true
            }
          })
          if (changed) tl.scrollTrigger?.refresh()
        }, 200)
      }
      window.addEventListener('resize', onResize)

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        if (resizeTimer) clearTimeout(resizeTimer)
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [isDesktop, reduced])

  return (
    <section ref={sceneRef} data-scene="04-segments" className={styles.scene}>
      <div className={styles.bgStack}>
        {EMPATHY_SEGMENTS.map((seg, i) => (
          <div
            key={seg.id}
            data-bg={seg.id}
            className={styles.bgLayer}
            style={{
              backgroundColor: seg.colorVar,
              ['--mask-radius' as string]: i === 0 ? '200%' : '0%',
              ['--mask-origin' as string]: '50% 50%',
            }}
          />
        ))}
      </div>

      <header className={styles.header}>
        <p className={styles.overline}>A quién servimos</p>
        <h2 className={styles.title}>Tres segmentos, tres historias</h2>
      </header>

      {EMPATHY_SEGMENTS.map((seg) => (
        <div key={seg.id} data-segment={seg.id} className={styles.segment}>
          <div className={styles.segmentInner}>
            <div data-character-col className={styles.characterCol}>
              <p className={styles.marker}>{seg.id.toUpperCase()}</p>
              <Image
                src={seg.character}
                alt={seg.personaName}
                width={320}
                height={320}
                className={styles.character}
              />
              <p className={styles.personaName}>
                {seg.personaName}, {seg.age}
              </p>
            </div>
            <div className={styles.quadrantViewport}>
              <div data-quadrant-stack className={styles.quadrantStack}>
                {QUADRANT_ORDER.map((key) => {
                  const q = seg.quadrants[key]
                  return (
                    <div key={key} data-quadrant={key} className={styles.quadrant}>
                      <p className={styles.quadrantLabel}>{q.label}</p>
                      <p className={styles.quadrantBody}>{q.body}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 2: Run structural tests to verify they still pass**

Run: `npx vitest run components/__tests__/about/segments-stage.test.tsx`
Expected: PASS, 7 tests (GSAP lives inside a `useEffect` gated by `isDesktop && !reduced`; tests render without triggering the effect because the effect bails out or the async GSAP import isn't awaited).

- [ ] **Step 3: Commit**

```bash
git add components/about/segments-stage.tsx
git commit -m "feat(about): add GSAP pinned timeline with quadrant beats and transitions to SegmentsStage"
```

---

## Task 5: Rewrite scene 4 to use SegmentsStage + mobile fallback

**Files:**
- Modify: `components/about/scenes/scene-04-segments.tsx`

- [ ] **Step 1: Replace the scene file**

Full replacement of `components/about/scenes/scene-04-segments.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { SegmentsStage } from '../segments-stage'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene04Segments() {
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const useStage = isDesktop && !reduced

  if (useStage) return <SegmentsStage />

  return (
    <section data-scene="04-segments" className="py-16 bg-background">
      <div className="mx-auto max-w-xl px-6 space-y-12">
        {EMPATHY_SEGMENTS.map((seg) => (
          <article
            key={seg.id}
            className="rounded-2xl border border-border p-6"
            style={{
              backgroundColor: `color-mix(in oklch, ${seg.colorVar} 10%, transparent)`,
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Image
                src={seg.character}
                alt={seg.personaName}
                width={80}
                height={80}
              />
              <div>
                <p
                  className="text-xs font-bold"
                  style={{ color: seg.colorVar }}
                >
                  {seg.id.toUpperCase()}
                </p>
                <h3 className="text-xl font-bold">
                  {seg.personaName}, {seg.age}
                </h3>
              </div>
            </div>
            <dl className="space-y-3">
              {QUADRANT_ORDER.map((key) => (
                <div key={key}>
                  <dt
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: seg.colorVar }}
                  >
                    {seg.quadrants[key].label}
                  </dt>
                  <dd className="text-sm text-foreground/80">
                    {seg.quadrants[key].body}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in any scene 4 / segments-stage / empathy file. Pre-existing errors in unrelated files (e.g. `theme-toggle.tsx` missing `next-themes`) are OK.

- [ ] **Step 3: Run the scenes smoke test**

Run: `npx vitest run components/__tests__/about/scenes.smoke.test.tsx`
Expected: PASS — scene 4 still mounts without errors.

- [ ] **Step 4: Commit**

```bash
git add components/about/scenes/scene-04-segments.tsx
git commit -m "feat(about): wire scene 4 to SegmentsStage with mobile fallback"
```

---

## Task 6: Delete obsolete empathy-map component and its test

**Files:**
- Delete: `components/about/empathy-map.tsx`
- Delete: `components/__tests__/about/empathy-map.test.tsx`
- Modify: `components/__tests__/design-system.test.ts`

- [ ] **Step 1: Delete `components/about/empathy-map.tsx`**

```bash
rm components/about/empathy-map.tsx
```

- [ ] **Step 2: Delete `components/__tests__/about/empathy-map.test.tsx`**

```bash
rm components/__tests__/about/empathy-map.test.tsx
```

- [ ] **Step 3: Remove the allowlist entry in `components/__tests__/design-system.test.ts`**

The file has an array with `'empathy-map.tsx',` at line 146 (inside the `STYLE_ALLOWLIST` array). Edit the file to remove that single line. After the edit, lines 145 and 147 of the original file become consecutive:

Before:
```ts
    'about-header.tsx',
    'empathy-map.tsx',
    'logo-marquee.tsx',
```

After:
```ts
    'about-header.tsx',
    'logo-marquee.tsx',
```

Leave every other line in the array intact.

- [ ] **Step 4: Run the design-system test to verify it still passes**

Run: `npx vitest run components/__tests__/design-system.test.ts`
Expected: PASS — the allowlist removal doesn't flag any violations because `empathy-map.tsx` no longer exists to scan.

- [ ] **Step 5: Run the full about test suite**

Run: `npx vitest run components/__tests__/about/`
Expected: PASS across all remaining files (empathy-map.test.tsx is deleted and no longer runs).

- [ ] **Step 6: Commit**

```bash
git add -u
git commit -m "chore(about): remove obsolete empathy-map component and test"
```

Note: using `git add -u` to capture both the deletions and the allowlist edit together. If the staging doesn't include the allowlist edit, add it explicitly with `git add components/__tests__/design-system.test.ts`.

---

## Task 7: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm dev server is running**

The user typically has `bun run dev` running. Confirm at `http://localhost:3000/about` by scrolling to scene 4.

- [ ] **Step 2: Verify desktop pinned interactions (≥768px viewport, no reduced motion)**

Manual checklist in the browser:
  - [ ] Scene 4 pins when its top reaches the viewport top. Scroll continues for roughly 6× viewport heights before the pin releases.
  - [ ] Segment A (Laura) renders first with the pop-colored background. Character is on the left, marker "A" above the character, `Laura, 24` below the character.
  - [ ] Scrolling cycles the quadrant text on the right through `piensa` → `ve` → `oye` → `dice` → `duele` → `aspira`, each sliding up from below.
  - [ ] At the end of Laura's 6 beats, Laura's character slides left and off-screen, Carlos's character slides in from the right, and the background color morphs from pop to slate via a circle expansion originating from Carlos's character position.
  - [ ] Carlos's 6 quadrants cycle the same way, followed by another transition to María with her orange color and another circle expansion.
  - [ ] María's 6 quadrants cycle and then the pin releases and the page scrolls into scene 5.
  - [ ] Scrubbing backward through any transition reverses the circle mask smoothly — the previous persona's background layer reasserts.
  - [ ] Resizing the window during the pinned scroll does not jump the scroll position (there may be a brief 200ms delay before the mask origin updates — this is expected).

- [ ] **Step 3: Verify mobile fallback (<768px viewport)**

In DevTools device emulation or narrow the window below 768px:
  - [ ] Scene 4 renders three stacked `<article>` cards, one per segment.
  - [ ] Each card shows the character image (small), `A` / `B` / `C` marker, `personaName, age`, and all six quadrants listed with labels.
  - [ ] Card background is a 10% tint of the segment's `colorVar`.
  - [ ] No pinning, no scrubbing, no circle mask animation.

- [ ] **Step 4: Verify reduced-motion fallback**

In Chrome DevTools → More tools → Rendering → Emulate CSS media feature prefers-reduced-motion → reduce, then reload:
  - [ ] Scene 4 renders the stacked mobile-style fallback (same code path as mobile).
  - [ ] No GSAP pinning and no animated transitions in scene 4.

- [ ] **Step 5: No commit for this task** — manual verification only.

---

## Task 8: Final test sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full Vitest suite**

Run: `npx vitest run`
Expected: PASS across all test files.

- [ ] **Step 2: Commit any incidental formatting fixes**

If any auto-applied formatting changes exist:

```bash
git add -u
git commit -m "chore(about): post-sweep formatting for scene 4"
```

Otherwise skip this step.

---

## Self-Review Notes

**Spec coverage check:**
- Layout per segment (character + marker + name + cycling quadrants) → Task 3 DOM + Task 2 CSS ✓
- Pinned scroll, 600% end, scrub 1 → Task 4 ✓
- 18-beat master timeline with transitions overlapping `piensa` → Task 4 timeline-building functions ✓
- Per-beat slide via `yPercent` on `[data-quadrant-stack]` → Task 4 `addQuadrantBeats` ✓
- Segment transition sub-tweens (slide-off, slide-in, mask expand) → Task 4 `addTransition` ✓
- Circle-mask via `--mask-radius` / `--mask-origin` CSS variables → Task 2 CSS + Task 3 initial inline styles + Task 4 GSAP tween ✓
- Char-center math and debounced resize handler → Task 4 `getCharCenter` + `onResize` ✓
- QUADRANT_ORDER data constant → Task 1 ✓
- Mobile & reduced-motion stacked fallback → Task 5 ✓
- Deletions (empathy-map.tsx, its test, allowlist entry) → Task 6 ✓
- Unit tests for structural rendering → Task 3 test file ✓
- Manual browser verification → Task 7 ✓

**Placeholder scan:** No TBDs, no "add error handling", no "similar to Task N" — every step has complete code.

**Type consistency:** `SegmentsStage`, `QUADRANT_ORDER`, `EMPATHY_SEGMENTS`, `[data-segment]`, `[data-bg]`, `[data-character-col]`, `[data-quadrant-stack]`, `[data-quadrant]`, `styles.scene/bgStack/bgLayer/header/...`, `--mask-radius`, `--mask-origin` — all used consistently across tasks 2, 3, 4, 5.

**Risks not covered by tasks:** the GSAP timeline itself is not unit-tested (per spec, GSAP + jsdom is fragile). Task 7 manual verification is the compensating control.
