# Scene 4 Rotating Quadrant Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current linear slide-up transition for each persona's six quadrants in scene 4 with a rotating wheel where quadrants orbit an anchor point and sweep into the reading position counterclockwise per scroll beat.

**Architecture:** Each persona's right column becomes a `.wheel` container holding an `.orbit` element with six `.quadrantSlot` children positioned radially via per-slot `--slot-angle` + `rotate/translate` transforms. GSAP rotates the orbit by −60° per beat and simultaneously counter-rotates each slot's inner `.quadrantCounterDynamic` element so text stays upright. Segment transitions fade the outgoing and incoming wheels in sync with the existing character slide + circle-mask choreography.

**Tech Stack:** Next.js 16 + React 19, GSAP 3 + ScrollTrigger (already registered), CSS module with `transform`-based radial layout, Vitest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-04-13-scene-4-wheel-design.md`

---

## File Structure

**Modified files:**
- `components/about/segments-stage.tsx` — replace the right column's DOM (`.quadrantViewport` / `.quadrantStack`) with the wheel/orbit/slot/counter structure. Rewrite `addQuadrantBeats` to rotate the orbit + counter-rotate per slot + tween ambient opacities. Extend `addTransition` to fade the wheel elements alongside character slide. Update initial `gsap.set` for wheel slot opacities.
- `components/about/segments-stage.module.css` — remove `.quadrantViewport`, `.quadrantStack`, `.quadrant` blocks. Add `.wheel`, `.orbit`, `.quadrantSlot`, `.quadrantCounter`, `.quadrantCounterDynamic`. `.quadrantLabel` and `.quadrantBody` stay unchanged.
- `components/__tests__/about/segments-stage.test.tsx` — update the existing "renders all six quadrants..." test to use `[data-quadrant-orbit]` as the parent selector instead of `[data-quadrant-stack]`. Add two new tests for slot angles and wheel/orbit presence.

**New files:** none.
**Deleted files:** none.

---

## Task 1: CSS module — remove stack, add wheel/orbit classes

**Files:**
- Modify: `components/about/segments-stage.module.css`

- [ ] **Step 1: Read the current `components/about/segments-stage.module.css`**

Use Read or `cat` to see the current file. You should find these blocks near the bottom:

```css
.quadrantViewport {
  overflow: hidden;
  height: 12rem;
  position: relative;
  min-width: 0;
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
```

Leave `.quadrantLabel` and `.quadrantBody` blocks alone — they are reused by the new structure.

- [ ] **Step 2: Replace those three blocks with the wheel/orbit/slot/counter blocks**

Remove the three old blocks (`.quadrantViewport`, `.quadrantStack`, `.quadrant`) and insert these five new blocks in their place (keeping `.quadrantLabel` and `.quadrantBody` unchanged below them):

```css
.wheel {
  --wheel-radius: 48rem;
  --wheel-anchor-x: 0%;
  --wheel-anchor-y: 50%;

  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: visible;
}

.orbit {
  position: absolute;
  top: var(--wheel-anchor-y);
  left: var(--wheel-anchor-x);
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.quadrantSlot {
  position: absolute;
  top: 0;
  left: 0;
  width: 28rem;
  margin-top: -6rem;
  transform: rotate(var(--slot-angle)) translate(var(--wheel-radius));
  transform-origin: 0 0;
  will-change: transform, opacity;
  opacity: 0;
}

.quadrantCounter {
  display: block;
  transform: rotate(calc(-1 * var(--slot-angle)));
  transform-origin: 0 50%;
}

.quadrantCounterDynamic {
  display: block;
  will-change: transform;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/about/segments-stage.module.css
git commit -m "refactor(about): replace scene 4 quadrant stack classes with wheel/orbit/slot/counter"
```

---

## Task 2: Update tests to target the orbit selector and add new tests

**Files:**
- Modify: `components/__tests__/about/segments-stage.test.tsx`

- [ ] **Step 1: Read the current test file**

Use Read to see it. You will find a test named "renders all six quadrants inside each segment in QUADRANT_ORDER" whose body uses `[data-quadrant-stack]` as the parent selector for locating the quadrant elements.

- [ ] **Step 2: Update the existing test's selector**

Change the selector from `[data-quadrant-stack]` to `[data-quadrant-orbit]`. The rest of the test (asserting each `[data-quadrant]` child has the right order, label, and body) stays identical. The updated test block becomes:

```tsx
  it('renders all six quadrants inside each segment in QUADRANT_ORDER', () => {
    const { container } = render(<SegmentsStage />)
    for (const seg of EMPATHY_SEGMENTS) {
      const group = container.querySelector(`[data-segment="${seg.id}"]`)
      expect(group).not.toBeNull()
      const orbit = group!.querySelector('[data-quadrant-orbit]')
      expect(orbit).not.toBeNull()
      const quadrants = orbit!.querySelectorAll('[data-quadrant]')
      expect(quadrants).toHaveLength(6)
      QUADRANT_ORDER.forEach((key, i) => {
        expect(quadrants[i]).toHaveAttribute('data-quadrant', key)
        expect(quadrants[i].textContent).toContain(seg.quadrants[key].label)
        expect(quadrants[i].textContent).toContain(seg.quadrants[key].body)
      })
    }
  })
```

- [ ] **Step 3: Add two new tests after the existing ones**

Append these two tests inside the existing `describe('SegmentsStage — structure', () => { ... })` block, just before the closing `})`:

```tsx
  it('each quadrant slot has its --slot-angle CSS custom property', () => {
    const { container } = render(<SegmentsStage />)
    const slots = container.querySelectorAll('[data-segment="a"] [data-quadrant]')
    expect(slots).toHaveLength(6)
    slots.forEach((slot, i) => {
      const angle = (slot as HTMLElement).style.getPropertyValue('--slot-angle')
      expect(angle).toBe(`${i * 60}deg`)
    })
  })

  it('each segment has a data-quadrant-wheel and data-quadrant-orbit', () => {
    const { container } = render(<SegmentsStage />)
    for (const id of ['a', 'b', 'c']) {
      const group = container.querySelector(`[data-segment="${id}"]`)
      expect(group!.querySelector('[data-quadrant-wheel]')).not.toBeNull()
      expect(group!.querySelector('[data-quadrant-orbit]')).not.toBeNull()
    }
  })
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run components/__tests__/about/segments-stage.test.tsx`
Expected: multiple failures — the new `[data-quadrant-orbit]` selector, `[data-quadrant-wheel]` selector, and `--slot-angle` property don't exist on the component yet (Task 3 adds them).

- [ ] **Step 5: Commit (the failing tests)**

```bash
git add components/__tests__/about/segments-stage.test.tsx
git commit -m "test(about): update scene 4 tests for wheel structure"
```

---

## Task 3: Rewrite the right column's DOM to use the wheel structure

**Files:**
- Modify: `components/about/segments-stage.tsx`

- [ ] **Step 1: Replace the right-column JSX inside each segment's `segmentInner`**

In `components/about/segments-stage.tsx`, find this block (around lines 190–202):

```tsx
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
```

Replace it with:

```tsx
            <div data-quadrant-wheel className={styles.wheel}>
              <div data-quadrant-orbit className={styles.orbit}>
                {QUADRANT_ORDER.map((key, i) => {
                  const q = seg.quadrants[key]
                  return (
                    <div
                      key={key}
                      data-quadrant={key}
                      className={styles.quadrantSlot}
                      style={{ ['--slot-angle' as string]: `${i * 60}deg` }}
                    >
                      <div className={styles.quadrantCounter}>
                        <div data-quadrant-counter className={styles.quadrantCounterDynamic}>
                          <p className={styles.quadrantLabel}>{q.label}</p>
                          <p className={styles.quadrantBody}>{q.body}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
```

Do not touch any other JSX in this file in this step — leave the scene header, background layers, character column, and `addQuadrantBeats` / `addTransition` functions exactly as they are. They are updated in Task 4.

- [ ] **Step 2: Run the structural tests to verify they pass**

Run: `npx vitest run components/__tests__/about/segments-stage.test.tsx`
Expected: PASS, 9 tests (7 original structural + 2 new wheel tests).

Note: the existing tests in the scene smoke suite may still pass because scene 4 still mounts without runtime errors, even though the animation logic in `addQuadrantBeats` still references `[data-quadrant-stack]` — that selector returns null and the `for` loop over beats short-circuits silently inside GSAP. This is expected: Task 4 replaces the animation logic.

- [ ] **Step 3: Commit**

```bash
git add components/about/segments-stage.tsx
git commit -m "feat(about): render scene 4 quadrants as wheel slots with per-slot angles"
```

---

## Task 4: Rewrite the GSAP timeline to rotate the orbit and counter-rotate counters

**Files:**
- Modify: `components/about/segments-stage.tsx`

- [ ] **Step 1: Replace the initial-state `gsap.set` block**

Find this block (around lines 48–56):

```ts
      // Seed character positions: A visible at center, B and C off-stage right.
      gsap.set(segmentEls[0].querySelector('[data-character-col]'), { xPercent: 0 })
      gsap.set(segmentEls[1].querySelector('[data-character-col]'), { xPercent: 120 })
      gsap.set(segmentEls[2].querySelector('[data-character-col]'), { xPercent: 120 })

      // Seed segment opacity: A visible, B/C hidden until their transition.
      gsap.set(segmentEls[0], { autoAlpha: 1 })
      gsap.set(segmentEls[1], { autoAlpha: 0 })
      gsap.set(segmentEls[2], { autoAlpha: 0 })
```

Replace it with:

```ts
      // Seed character positions: A visible at center, B and C off-stage right.
      gsap.set(segmentEls[0].querySelector('[data-character-col]'), { xPercent: 0 })
      gsap.set(segmentEls[1].querySelector('[data-character-col]'), { xPercent: 120 })
      gsap.set(segmentEls[2].querySelector('[data-character-col]'), { xPercent: 120 })

      // Seed segment opacity: A visible, B/C hidden until their transition.
      gsap.set(segmentEls[0], { autoAlpha: 1 })
      gsap.set(segmentEls[1], { autoAlpha: 0 })
      gsap.set(segmentEls[2], { autoAlpha: 0 })

      // Seed wheel state per segment: orbit at rotation 0, dynamic counters at 0,
      // slot 0 fully opaque, slot 1 (next) at ambient 0.2, the rest fully hidden.
      segmentEls.forEach((segEl) => {
        gsap.set(segEl.querySelector('[data-quadrant-orbit]'), { rotate: 0 })
        gsap.set(segEl.querySelectorAll('[data-quadrant-counter]'), { rotate: 0 })
        const slots = segEl.querySelectorAll('[data-quadrant]')
        gsap.set(slots[0], { opacity: 1 })
        gsap.set(slots[1], { opacity: 0.2 })
        gsap.set([slots[2], slots[3], slots[4], slots[5]], { opacity: 0 })
      })
```

- [ ] **Step 2: Replace the `addQuadrantBeats` function body**

Find this function (around lines 70–80):

```ts
      // Build each segment's quadrant beats: each beat shifts by one quadrant height
      // (100 / BEATS_PER_SEGMENT % of the stack's own height).
      const addQuadrantBeats = (segIndex: number, startLabel: number) => {
        const stackEl = segmentEls[segIndex].querySelector('[data-quadrant-stack]')
        const stepPct = 100 / BEATS_PER_SEGMENT
        for (let i = 1; i < BEATS_PER_SEGMENT; i++) {
          tl.to(
            stackEl,
            { yPercent: -stepPct * i, duration: 0.6, ease: 'power2.inOut' },
            startLabel + i - 1 + 0.2,
          )
        }
      }
```

Replace it with:

```ts
      // Build each segment's quadrant beats. Per beat, rotate the orbit -60deg
      // (counterclockwise), counter-rotate each slot's dynamic counter +60deg to
      // keep text upright, and ease the slots' opacities so the anchored slot is
      // fully visible, its immediate neighbor sits at ambient 0.2, and the rest
      // are hidden.
      const addQuadrantBeats = (segIndex: number, startLabel: number) => {
        const orbit = segmentEls[segIndex].querySelector('[data-quadrant-orbit]')
        const counters = segmentEls[segIndex].querySelectorAll('[data-quadrant-counter]')
        const slots = segmentEls[segIndex].querySelectorAll('[data-quadrant]')

        for (let beat = 1; beat < BEATS_PER_SEGMENT; beat++) {
          const at = startLabel + beat - 1 + 0.2

          tl.to(orbit, { rotate: -60 * beat, duration: 0.6, ease: 'power2.inOut' }, at)
          tl.to(counters, { rotate: 60 * beat, duration: 0.6, ease: 'power2.inOut' }, at)

          slots.forEach((slot, slotIdx) => {
            const dist = Math.min(
              (slotIdx - beat + BEATS_PER_SEGMENT) % BEATS_PER_SEGMENT,
              (beat - slotIdx + BEATS_PER_SEGMENT) % BEATS_PER_SEGMENT,
            )
            const target = dist === 0 ? 1 : dist === 1 ? 0.2 : 0
            tl.to(slot, { opacity: target, duration: 0.6, ease: 'power2.inOut' }, at)
          })
        }
      }
```

- [ ] **Step 3: Extend `addTransition` to fade the wheel with the character**

Find the `addTransition` function (around lines 83–105):

```ts
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
          { ['--mask-radius' as string]: '200%', duration: 1.6, ease: 'power2.out' },
          startLabel + 0.15,
        )
      }
```

Replace the function body with this extended version that also fades the wheels:

```ts
      // Build a segment→next transition starting at the given label.
      const addTransition = (outIndex: number, inIndex: number, startLabel: number) => {
        const outChar = segmentEls[outIndex].querySelector('[data-character-col]')
        const inChar = segmentEls[inIndex].querySelector('[data-character-col]')
        const outWheel = segmentEls[outIndex].querySelector('[data-quadrant-wheel]')
        const inWheel = segmentEls[inIndex].querySelector('[data-quadrant-wheel]')
        const inBg = bgEls[inIndex]

        tl.to(outChar, { xPercent: -120, duration: 0.6, ease: 'power2.in' }, startLabel)
        tl.to(outWheel, { autoAlpha: 0, duration: 0.4 }, startLabel)
        tl.to(segmentEls[outIndex], { autoAlpha: 0, duration: 0.3 }, startLabel + 0.3)
        tl.set(segmentEls[inIndex], { autoAlpha: 1 }, startLabel + 0.1)
        tl.fromTo(
          inChar,
          { xPercent: 120 },
          { xPercent: 0, duration: 0.6, ease: 'power2.out' },
          startLabel + 0.1,
        )
        tl.fromTo(
          inWheel,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.4 },
          startLabel + 0.25,
        )
        // Custom-property tween: GSAP CSSPlugin interpolates the --mask-radius
        // string as a plain percentage. Do NOT use calc() or any non-percentage
        // value here — CSSPlugin cannot interpolate those.
        tl.to(
          inBg,
          { ['--mask-radius' as string]: '200%', duration: 1.6, ease: 'power2.out' },
          startLabel + 0.15,
        )
      }
```

- [ ] **Step 4: Run the structural tests**

Run: `npx vitest run components/__tests__/about/segments-stage.test.tsx`
Expected: PASS, 9 tests.

- [ ] **Step 5: Run the scenes smoke test**

Run: `npx vitest run components/__tests__/about/scenes.smoke.test.tsx`
Expected: PASS — the scene still mounts without errors.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `segments-stage.tsx` or the test file. Pre-existing unrelated errors (e.g. `theme-toggle.tsx` missing `next-themes`, vitest globals) are OK — ignore them.

- [ ] **Step 7: Commit**

```bash
git add components/about/segments-stage.tsx
git commit -m "feat(about): rotate scene 4 orbit per beat with upright counter-rotation and wheel fades"
```

---

## Task 5: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm dev server is running**

The user typically has `bun run dev` running. Navigate to `http://localhost:3000/about` and scroll to scene 4.

- [ ] **Step 2: Verify desktop wheel interactions (≥768px viewport, no reduced motion)**

Manual checklist:
  - [ ] Scene 4 pins at top; scrolling reveals Laura first with pop-teal background.
  - [ ] Right column shows `piensa` quadrant label + body as the initial anchor.
  - [ ] Scrolling rotates the wheel counterclockwise: `piensa` sweeps up and away along an arc, `ve` rotates in from below to take the anchor slot.
  - [ ] Text stays upright during the rotation (no tilted/spinning text).
  - [ ] The upcoming quadrant is faintly visible (~20% opacity) as ambient context; the ones beyond that are fully hidden.
  - [ ] Rotation continues through `oye`, `dice`, `duele`, `aspira` — five beats, anchoring each in turn.
  - [ ] At A→B transition, Laura's character slides off-left, the wheel fades out with her, Carlos slides in from right with his wheel fading in already at `piensa`. Background morphs to slate via circle-mask.
  - [ ] Carlos's wheel rotates through his 6 quadrants identically.
  - [ ] B→C transition to María with orange background follows the same pattern.
  - [ ] Scrubbing backward through any beat reverses the rotation smoothly; text remains upright.
  - [ ] Scrubbing backward through a segment transition reverses the wheel fades and character slides.

- [ ] **Step 3: Verify mobile fallback (<768px viewport)**

  - [ ] Scene 4 renders three stacked `<article>` cards (the existing mobile fallback is untouched).
  - [ ] No wheel, no rotation, all quadrants listed statically.

- [ ] **Step 4: Verify reduced-motion fallback**

DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload:
  - [ ] Scene 4 renders the stacked mobile-style fallback.
  - [ ] No GSAP, no wheel rotation.

- [ ] **Step 5: No commit for this task** — manual verification only.

---

## Task 6: Final test sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full Vitest suite**

Run: `npx vitest run`
Expected: PASS across all files.

- [ ] **Step 2: Commit any incidental formatting fixes**

If formatting auto-applied any changes:

```bash
git add -u
git commit -m "chore(about): post-sweep formatting for scene 4 wheel"
```

Otherwise skip.

---

## Self-Review Notes

**Spec coverage check:**
- Geometry: wheel / orbit / slot / counter CSS classes with `--wheel-radius`, `--wheel-anchor-x`, `--wheel-anchor-y`, `--slot-angle` → Task 1 ✓
- DOM structure with three transform layers per slot (positioning slot, static counter, dynamic counter) → Task 3 ✓
- Initial state: orbit at 0, dynamic counters at 0, slot opacities seeded → Task 4 Step 1 ✓
- Per-beat rotation: orbit -60°, counters +60°, ambient opacity distance math → Task 4 Step 2 ✓
- Segment transition: wheel fade-out on slide-off, fade-in on slide-in → Task 4 Step 3 ✓
- Existing behavior preserved: character slide, background circle-mask, pinned scroll, segment-transition labels at 6 and 12 → Task 4 keeps those tweens intact ✓
- Tests: existing quadrant-order test updated selector, two new tests for slot angles and wheel/orbit presence → Task 2 ✓
- Mobile fallback untouched → no task needed ✓
- Reduced motion untouched → no task needed ✓
- Manual verification → Task 5 ✓

**Placeholder scan:** No TBDs, no "add error handling", no "similar to Task N" — every step contains complete code blocks.

**Type consistency:** `wheel`, `orbit`, `quadrantSlot`, `quadrantCounter`, `quadrantCounterDynamic` all match between Task 1 CSS and Task 3 JSX. Data attributes `[data-quadrant-wheel]`, `[data-quadrant-orbit]`, `[data-quadrant-counter]`, `[data-quadrant]` match between Tasks 2 (tests), 3 (JSX), and 4 (GSAP selectors). `--slot-angle` is set in JSX (Task 3) and asserted in tests (Task 2).

**Known risk acknowledged but not blocking:** the 48rem wheel radius may visually intrude on narrow desktops (<1024px). Mitigation is tunable via CSS custom property post-verification. Not a blocker for task completion.
