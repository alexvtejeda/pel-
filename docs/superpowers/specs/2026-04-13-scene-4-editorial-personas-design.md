# Scene 4 — Editorial Personas Design

**Date:** 2026-04-13
**Scope:** About page, Scene 04 (Segments / Empathy)
**Reference behavior:** https://giganticmedia.net/ (services section + circle-mask background zoom)
**Replaces:** the current radial empathy-map layout powered by `empathy-map.tsx`

## Goal

Rebuild scene 4 as an editorial, pinned-scroll experience. Each of the three user segments (Laura, Carlos, María) occupies the viewport in turn with a character illustration on the left and their six empathy-map quadrants cycling on the right. Background color changes between segments via a circle-mask expansion originating from the incoming character.

## Layout per segment

- **Character illustration** pinned on the left, replacing the "services" label position from the reference.
- **Segment marker** — single letter `A` / `B` / `C` above the character. Persistent while that segment is on screen.
- **Persona identity** — `personaName, age` (e.g. "Laura, 24") below the character. No archetype, no blurb. Persistent across all six quadrant beats for that segment.
- **Right column** — a single visible quadrant at a time, cycling `piensa` → `ve` → `oye` → `dice` → `duele` → `aspira` as the user scrolls. The new quadrant slides up from below as the previous one slides up and out. Each quadrant renders its label (uppercase) above its body.

## Interaction & animation

### Pinned scroll

- One `ScrollTrigger` pin on the scene root.
- `start: 'top top'`, `end: '+=600%'`, `scrub: 1`.
- 18 quadrant beats total (3 segments × 6 quadrants), plus 3 segment-transition beats that share time with the slide-off/slide-in.
- Pinned only on desktop (`isDesktop && !reduced`). Mobile and reduced-motion fall through to a stacked list.

### Master timeline

Normalized to 18 time units. Each segment transition overlaps the incoming persona's first quadrant (`piensa`): the circle-mask expands at the same moment `piensa` becomes visible, so the new persona is introduced with their first thought.

| Time | Event |
| --- | --- |
| 0    | Segment A enters — `piensa` visible (bg A already full) |
| 1    | A — `ve` |
| 2    | A — `oye` |
| 3    | A — `dice` |
| 4    | A — `duele` |
| 5    | A — `aspira` |
| 6    | A→B transition — character A slides off, B slides in, bg B circle expands, B's `piensa` visible |
| 7    | B — `ve` |
| 8    | B — `oye` |
| 9    | B — `dice` |
| 10   | B — `duele` |
| 11   | B — `aspira` |
| 12   | B→C transition — character B slides off, C slides in, bg C circle expands, C's `piensa` visible |
| 13   | C — `ve` |
| 14   | C — `oye` |
| 15   | C — `dice` |
| 16   | C — `duele` |
| 17   | C — `aspira` |

### Per-beat slide

Each segment's right column is a pre-rendered vertical stack of 6 quadrant blocks inside an `overflow: hidden` viewport. Per beat, GSAP tweens the stack's `yPercent` by `-100` times the beat index. `duration: 0.6`, `ease: 'power2.inOut'`. An offset of `+0.2` on each beat lets the reader sit on each quadrant before the next slide starts.

### Segment transitions

Composed of three synchronized sub-tweens, fired at labels 6 (A→B) and 12 (B→C):

1. **Outgoing character slide-off** — `xPercent: -120`, `duration: 0.6`, `ease: 'power2.in'` on the outgoing segment's `[data-character-col]`.
2. **Incoming character slide-in** — `xPercent: [120 → 0]`, `duration: 0.6`, `ease: 'power2.out'` on the incoming segment's `[data-character-col]`. Starts at `transition + 0.1` for a crossing effect.
3. **Background circle-mask expand** — on the incoming background layer, tween `--mask-radius` from `0%` → `200%`, `duration: 0.8`, `ease: 'power2.out'`. Starts at `transition + 0.15` so the color arrives with the character.

All three personas slide off stage-left and new ones enter from stage-right. No per-segment direction logic.

### Circle-mask technique

Background layers use CSS variables driven by GSAP:

```css
.bg-layer {
  clip-path: circle(var(--mask-radius, 0%) at var(--mask-origin, 50% 50%));
}
```

GSAP 3 CSSPlugin tweens `--mask-radius` as a plain percentage string. `--mask-origin` is computed once at mount (and on debounced resize) from the incoming character column's bounding rect relative to the scene.

```ts
const getCharCenter = (segmentEl: HTMLElement) => {
  const charEl = segmentEl.querySelector('[data-character-col]') as HTMLElement
  const rect = charEl.getBoundingClientRect()
  const parentRect = segmentEl.getBoundingClientRect()
  const x = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) * 100
  const y = ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height) * 100
  return `${x}% ${y}%`
}
```

**Initial state:**
- Segment A background: `--mask-radius: 200%` (fully visible)
- Segments B and C backgrounds: `--mask-radius: 0%` (hidden), `--mask-origin` set per segment

Max radius is `200%` to guarantee full coverage on ultra-wide aspect ratios.

### Resize handling

A debounced (200ms) window `resize` listener re-reads char-centers. If any segment's new center differs from the stored one by more than 1% (either axis), the handler updates `--mask-origin` directly via `style.setProperty` and calls `ScrollTrigger.refresh()`. Tighter thresholds cause unnecessary refreshes; looser ones let the mask origin drift visibly.

### Backward scrub

Scrubbing back through a transition reverses the GSAP tween naturally. `--mask-radius` interpolates from `200%` to `0%`, restoring the previous segment's background. No manual state management.

## DOM structure

```tsx
<section data-scene="04-segments" ref={pinRef} className="relative overflow-hidden">
  {/* Layer 0 — background stack */}
  <div className="absolute inset-0 -z-10">
    <div data-bg="a" className="bg-layer" style={{ backgroundColor: segA.colorVar, '--mask-radius': '200%' }} />
    <div data-bg="b" className="bg-layer" style={{ backgroundColor: segB.colorVar, '--mask-radius': '0%' }} />
    <div data-bg="c" className="bg-layer" style={{ backgroundColor: segC.colorVar, '--mask-radius': '0%' }} />
  </div>

  {/* Layer 1 — scene chrome */}
  <header className="absolute top-0 left-0 right-0 pt-16 px-8 z-10">
    <p className="text-xs uppercase tracking-widest opacity-60">A quién servimos</p>
    <h2 className="text-3xl md:text-4xl font-bold">Tres segmentos, tres historias</h2>
  </header>

  {/* Layer 2 — three stacked persona groups */}
  {EMPATHY_SEGMENTS.map((seg) => (
    <div key={seg.id} data-segment={seg.id} className="absolute inset-0 flex items-center justify-center">
      <div className="grid grid-cols-2 gap-16 max-w-6xl mx-auto px-12">
        <div data-character-col className="flex flex-col items-center">
          <span className="segment-marker text-sm font-bold tracking-widest opacity-70">{seg.id.toUpperCase()}</span>
          <Image src={seg.character} alt={seg.personaName} width={320} height={320} />
          <p className="persona-name mt-4 text-xl font-semibold">{seg.personaName}, {seg.age}</p>
        </div>
        <div data-quadrant-viewport className="overflow-hidden h-48">
          <div data-quadrant-stack>
            {QUADRANT_ORDER.map((q) => (
              <div key={q} data-quadrant={q} className="quadrant h-48 flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest font-bold mb-2">{seg.quadrants[q].label}</p>
                <p className="text-base leading-relaxed">{seg.quadrants[q].body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ))}
</section>
```

The `quadrant-viewport` has a fixed height equal to one quadrant's height; the inner `quadrant-stack` translates by `-100%` per beat to reveal the next one through the clipped viewport.

## Data shape

`lib/about/empathy-content.ts` adds one export; all existing content strings and types stay intact:

```ts
export const QUADRANT_ORDER = ['piensa', 've', 'oye', 'dice', 'duele', 'aspira'] as const
```

`archetype` and `blurb` remain in the data file even though the new scene no longer renders them — removing them would churn the file without benefit, and they may be reused on future content pages.

## Mobile & reduced-motion fallback

When `!isDesktop || reduced`, scene 4 renders a plain stacked list:

```tsx
<section className="py-16 bg-background">
  <div className="mx-auto max-w-xl px-6 space-y-12">
    {EMPATHY_SEGMENTS.map((seg) => (
      <article
        key={seg.id}
        className="rounded-2xl border border-border p-6"
        style={{ backgroundColor: `color-mix(in oklch, ${seg.colorVar} 10%, transparent)` }}
      >
        <div className="flex items-center gap-4 mb-4">
          <Image src={seg.character} width={80} height={80} alt="" />
          <div>
            <p className="text-xs font-bold" style={{ color: seg.colorVar }}>{seg.id.toUpperCase()}</p>
            <h3 className="text-xl font-bold">{seg.personaName}, {seg.age}</h3>
          </div>
        </div>
        <dl className="space-y-3">
          {QUADRANT_ORDER.map((q) => (
            <div key={q}>
              <dt className="text-xs font-bold uppercase tracking-wider" style={{ color: seg.colorVar }}>
                {seg.quadrants[q].label}
              </dt>
              <dd className="text-sm text-foreground/80">{seg.quadrants[q].body}</dd>
            </div>
          ))}
        </dl>
      </article>
    ))}
  </div>
</section>
```

No pin, no circle mask, no GSAP. Each card uses its segment's color at 10% opacity as a tint so mobile still gets the color cue.

## Files

**New:**
- `components/about/segments-stage.tsx` — desktop pinned-scene component with GSAP timeline, bg layers, three segment groups, char-center math, resize handler. ~200 lines.
- `components/__tests__/about/segments-stage.test.tsx` — unit tests for DOM structure and data rendering.

**Modified:**
- `components/about/scenes/scene-04-segments.tsx` — becomes thin. Branches on desktop+motion, renders `<SegmentsStage />` or the stacked mobile fallback. Drops the old `EmpathyMap` import and the old pinned timeline code.
- `lib/about/empathy-content.ts` — adds `QUADRANT_ORDER` constant. No other changes.

**Deleted:**
- `components/about/empathy-map.tsx`
- `components/__tests__/about/empathy-map.test.tsx`
- `empathy-map.tsx` entry from the allowlist in `components/__tests__/design-system.test.ts` if present.

## Tests

New: `components/__tests__/about/segments-stage.test.tsx`

Cases:
1. Renders three segment groups with `data-segment="a" | "b" | "c"`.
2. Each segment renders its marker (A / B / C) above the character.
3. Each segment renders its character image with `alt={personaName}`.
4. Each segment renders `personaName, age` persistent near the character.
5. Each segment renders all six quadrants inside `[data-quadrant-stack]` in the order defined by `QUADRANT_ORDER`.
6. Each quadrant element has `data-quadrant="piensa" | "ve" | ...` and renders both the label and body text from `empathy-content.ts`.
7. Three `[data-bg]` layers exist, one per segment, with inline `backgroundColor` set to each segment's `colorVar`.

Scene-level smoke test (`scenes.smoke.test.tsx`) stays green because `Scene04Segments` still exports the same function name. Mobile fallback is verified in a separate test block that forces `matchMedia` to report `<768px` and asserts the stacked `<article>` cards render all six quadrants per segment.

GSAP timeline logic itself is not unit-tested (GSAP + jsdom is fragile). Verification happens via a manual browser check during implementation.

## Known risks

1. **`--mask-radius` tween via CSSPlugin.** GSAP 3's CSSPlugin supports custom-property tweens but the value must stay a plain percentage string. Any future tweak trying `calc()` inside `--mask-radius` will break the tween. A comment at the tween site documents this constraint.
2. **Resize during pin.** `ScrollTrigger.refresh()` during an active scrub can jump the scroll position. The 200ms debounce with 1% change threshold minimizes this without letting the mask origin visibly drift.
3. **Circle-mask radius on ultra-wide viewports.** 150% does not cover corners on 21:9; 200% is used as the max radius.
4. **Quadrant stack viewport height.** The fixed-height `overflow: hidden` viewport locks each quadrant to the same visual height. All 18 quadrant bodies are similar length (2–3 sentences); if any overflows, the viewport height bumps uniformly and all beats adjust together.

## Out of scope

- No new empathy research content. Existing quadrant text from `empathy-content.ts` is reused verbatim.
- No i18n change — content stays Spanish-only, consistent with current scene 4.
- No accessibility pass beyond the existing mobile/reduced-motion fallback. The pinned scrub is visual polish; the same content is fully accessible in the fallback.
- No telemetry, no URL sync of active segment, no deep-linking. Ephemeral scroll state only.
