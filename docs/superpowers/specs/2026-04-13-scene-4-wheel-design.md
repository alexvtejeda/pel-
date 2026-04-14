# Scene 4 — Rotating Quadrant Wheel Design

**Date:** 2026-04-13
**Scope:** About page, Scene 04 (Segments / Empathy)
**Reference behavior:** https://giganticmedia.net/ — services section rotating wheel
**Replaces:** the current vertical-slide `.quadrantStack` mechanism in `SegmentsStage`

## Goal

Replace the current linear slide-up transition for each segment's six quadrants with a rotating wheel. Each persona's six empathy-map quadrants are arranged as slots around a circular orbit. As the user scrolls, the orbit rotates counterclockwise by 60° per beat, bringing the next quadrant into an anchor reading position while the previous one sweeps up and away along an arc. Mimics the gigantic-media services wheel while preserving all existing scene-4 behavior (pinned scroll, segment transitions with character slide + circle-mask background morph).

## What stays the same

- Three persona groups absolutely stacked, with backgrounds behind them
- Three-layer circle-mask background stack with `--mask-radius` / `--mask-origin` CSS variables
- Character column on the left with segment marker (A/B/C) + `personaName, age`
- Pinned `ScrollTrigger` on the scene root, `start: 'top top'`, `end: '+=600%'`, `scrub: 1`
- Master timeline normalized to 18 time units, labels 0–17
- Segment transitions at labels 6 (A→B) and 12 (B→C): outgoing character slide-off, incoming character slide-in, background circle-mask expansion
- Mobile & reduced-motion stacked fallback (`Scene04Segments` renders `<article>` cards)

## What changes

The right column of each segment no longer contains a `.quadrantViewport` + `.quadrantStack`. It now contains a `.wheel` with an `.orbit` element that holds six absolutely-positioned `.quadrantSlot` children. Each slot has its own static rotation around the orbit's center so the six slots fan out evenly. GSAP rotates the orbit itself per beat, sweeping each slot in turn to the anchor position.

## Geometry

### Anchor and radius

- **Anchor position**: to the right of the character column, vertically centered. In CSS the anchor is the transform-origin of the `.orbit` element.
- **`--wheel-radius`**: the distance from the orbit's center to each slot. Default `48rem` (wide wheel per Q3 answer C). Tunable via CSS custom property on `.wheel`.
- **`--wheel-anchor-x` / `--wheel-anchor-y`**: the orbit's transform-origin inside the `.wheel` container. Defaults `0% 50%` (left edge, vertically centered).

### Six slots

Each slot has a static angle offset `--slot-angle` equal to `i * 60deg` where `i` is the slot's index (0 for piensa, 1 for ve, etc.). The slot's `transform` is `rotate(var(--slot-angle)) translate(var(--wheel-radius))`, which places it on the rim of the circle at that angle. CSS transform order matters: rotate first, then translate along the rotated axis so the slot lands at distance `--wheel-radius` along the direction of its own angle.

## DOM structure

The right column of each segment becomes:

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

Three layers inside each slot:

1. `.quadrantSlot` — absolutely positioned on the rim via `rotate(--slot-angle) translate(--wheel-radius)`. Each slot has an opacity driven by GSAP per beat (1 for anchored, 0.2 for adjacent, 0 for everything else).
2. `.quadrantCounter` — static counter-rotation `rotate(calc(-1 * var(--slot-angle)))`. Cancels the slot's own angular offset so the text is upright when the orbit is at rotation 0.
3. `.quadrantCounterDynamic` — GSAP target. Starts at `rotate: 0` and is tweened to `60 * beat` degrees per beat. Compensates for the orbit's dynamic rotation to keep text upright during the sweep.

The outer `.orbit` element is the rigid body that GSAP rotates. The inner `.quadrantSlot`, `.quadrantCounter`, and `.quadrantCounterDynamic` elements provide the compound transform chain. GSAP never touches the static counter element, so it doesn't overwrite the baked CSS `rotate(...)` value.

## CSS module

Replace the `.quadrantViewport`, `.quadrantStack`, and `.quadrant` blocks in `components/about/segments-stage.module.css` with:

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

The existing `.quadrantLabel` and `.quadrantBody` classes are reused unchanged.

`margin-top: -6rem` shifts each slot up so its text block's vertical center aligns with the orbit origin — without it, the text hangs below the orbit attachment point and looks lopsided.

`overflow: visible` on `.wheel` is essential: with a 48rem radius, slots extend far outside the wheel's own box. The scene root still has `overflow: hidden` which clips anything escaping the viewport.

## GSAP timeline changes

Only the per-beat rotation and the segment-transition fade-in/out for the wheel need to change. The overall 18-unit timeline structure with labels 0–17 and transition anchors at 6 and 12 is unchanged.

### Initial state

`gsap.set` calls at mount time, for each segment:

```ts
gsap.set(segmentEls[i].querySelector('[data-quadrant-orbit]'), { rotate: 0 })
gsap.set(segmentEls[i].querySelectorAll('[data-quadrant-counter]'), { rotate: 0 })
// Slot opacities: slot 0 visible at full, slot 1 (next) at ambient 0.2, rest 0
const slots = segmentEls[i].querySelectorAll('[data-quadrant]')
gsap.set(slots[0], { opacity: 1 })
gsap.set(slots[1], { opacity: 0.2 })
gsap.set([slots[2], slots[3], slots[4], slots[5]], { opacity: 0 })
```

### Per-beat rotation (`addQuadrantBeats`)

```ts
const addQuadrantBeats = (segIndex: number, startLabel: number) => {
  const orbit = segmentEls[segIndex].querySelector('[data-quadrant-orbit]')
  const counters = segmentEls[segIndex].querySelectorAll('[data-quadrant-counter]')
  const slots = segmentEls[segIndex].querySelectorAll('[data-quadrant]')

  for (let beat = 1; beat < BEATS_PER_SEGMENT; beat++) {
    const at = startLabel + beat - 1 + 0.2

    // Orbit rotates -60deg per beat (counterclockwise).
    tl.to(orbit, { rotate: -60 * beat, duration: 0.6, ease: 'power2.inOut' }, at)

    // All counter-dynamic elements rotate +60deg per beat to stay upright.
    tl.to(counters, { rotate: 60 * beat, duration: 0.6, ease: 'power2.inOut' }, at)

    // Opacity: anchored slot (index === beat) to 1, adjacent to 0.2, rest to 0.
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

All three tweens per beat share `duration: 0.6` and `ease: 'power2.inOut'` and fire at the same timeline offset so rotation and counter-rotation stay synchronized. Text appears upright at all times.

### Segment transitions (`addTransition`)

The existing character slide-off / slide-in / mask-radius expand tweens stay. Two additional tweens fade the wheel itself:

```ts
const outWheel = segmentEls[outIndex].querySelector('[data-quadrant-wheel]')
const inWheel = segmentEls[inIndex].querySelector('[data-quadrant-wheel]')

tl.to(outWheel, { autoAlpha: 0, duration: 0.4 }, startLabel)
tl.fromTo(
  inWheel,
  { autoAlpha: 0 },
  { autoAlpha: 1, duration: 0.4 },
  startLabel + 0.25,
)
```

The outgoing wheel fades with the character slide-off. The incoming wheel fades in slightly after the incoming character begins its slide-in. The incoming wheel's orbit rotation is already at `0deg` from the initial `gsap.set`, so `piensa` is anchored and ready to read when the fade-in completes.

Backward scrub reverses the fade tweens naturally.

## Tests

Update `components/__tests__/about/segments-stage.test.tsx`:

1. Replace the existing test "renders all six quadrants inside each segment in QUADRANT_ORDER" — change the selector from `[data-quadrant-stack]` to `[data-quadrant-orbit]` for the parent, and keep the per-child `data-quadrant` assertions.

2. Add a new test for slot angles:

```tsx
it('each quadrant slot has its --slot-angle CSS custom property', () => {
  const { container } = render(<SegmentsStage />)
  const slots = container.querySelectorAll('[data-segment="a"] [data-quadrant]')
  slots.forEach((slot, i) => {
    const angle = (slot as HTMLElement).style.getPropertyValue('--slot-angle')
    expect(angle).toBe(`${i * 60}deg`)
  })
})
```

3. Add a new test for wheel and orbit presence:

```tsx
it('each segment has a data-quadrant-wheel and data-quadrant-orbit', () => {
  const { container } = render(<SegmentsStage />)
  for (const id of ['a', 'b', 'c']) {
    const group = container.querySelector(`[data-segment="${id}"]`)
    expect(group!.querySelector('[data-quadrant-wheel]')).not.toBeNull()
    expect(group!.querySelector('[data-quadrant-orbit]')).not.toBeNull()
  }
})
```

GSAP rotation logic remains untested (same reasoning as the previous scene-4 spec — GSAP + jsdom is unreliable). Manual browser verification is the authoritative sign-off.

## Mobile & reduced-motion fallback

**No change.** The `Scene04Segments` wrapper already branches on `isDesktop && !reduced`: desktop mounts `SegmentsStage`, mobile and reduced-motion render a `<dl>`-based stacked list that doesn't touch the wheel at all.

## Files

**Modified:**
- `components/about/segments-stage.tsx` — replace the right column's DOM and rewrite `addQuadrantBeats` + extend `addTransition`.
- `components/about/segments-stage.module.css` — remove old stack classes, add wheel/orbit/slot/counter classes.
- `components/__tests__/about/segments-stage.test.tsx` — update the stack-selector test, add two new tests.

**New files:** none.
**Deleted files:** none.

## Tunable knobs

CSS custom properties on `[data-quadrant-wheel]`:

| Property | Default | Controls |
|---|---|---|
| `--wheel-radius` | `48rem` | Orbit radius. Larger = wider arc, more dramatic sweep. |
| `--wheel-anchor-x` | `0%` | Horizontal transform-origin of the orbit. |
| `--wheel-anchor-y` | `50%` | Vertical transform-origin of the orbit. |

## Known risks

1. **Slot overflow on narrow desktop widths.** At `--wheel-radius: 48rem`, slots extend far beyond the `.wheel` container. On viewports narrower than ~1024px, the orbit could bleed into the character column. Mitigation: leave `--wheel-radius` tunable; adjust after manual verification. The scene root's `overflow: hidden` clips any bleed past the viewport edges.

2. **Counter-rotation desync.** The orbit and counter-dynamic elements must tween with identical duration and ease or text visibly wobbles during rotation. Mitigation: both tweens use `duration: 0.6, ease: 'power2.inOut'` inside the same `for` loop iteration and are added to the timeline at the same offset.

3. **GSAP overwriting static CSS counter-rotation.** If GSAP tweened `rotate` on the element that also has the static `rotate(calc(-1 * var(--slot-angle)))` CSS transform, GSAP would read the current value and replace it — clobbering the static counter. Mitigation: the static counter-rotation lives on `.quadrantCounter`, and GSAP tweens a separate nested child `.quadrantCounterDynamic`. Two elements, two transforms, no collision.

4. **Opacity tween count per beat.** Each beat tweens 6 slots' opacities in parallel. 5 beats per segment × 3 segments = 15 beats × 6 slots = 90 opacity tweens total. GSAP handles this easily; no performance concern on modern devices.

## Out of scope

- No redesign of the segment transition choreography (character slide + circle mask stay exactly as implemented).
- No change to background layers, anchor math, or debounced resize handler.
- No new persona data, no content rewrites. Existing quadrant labels and bodies are reused verbatim.
- No mobile wheel — mobile fallback remains the stacked card list.
