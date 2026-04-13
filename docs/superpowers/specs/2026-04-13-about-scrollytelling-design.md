# About Route Scrollytelling — Design Spec

**Date:** 2026-04-13
**Route:** `/about` (production: `https://pelurd.com/about`)
**Purpose:** Replace the current About page with a pinned-scroll narrative that doubles as a live-presentation tool for thesis defense and a permanent shareable pitch link for stakeholders.

## Goals

- Present the Pelú thesis (pitch, competition, segments, plans, Lean Canvas, numbers) as a single continuous scroll narrative.
- Work both **live** (presenter scrolls while narrating) and **self-paced** (shared link, no narrator).
- Ship to production on `main` — this is a permanent page, not a demo artifact.
- Spanish-only for now. i18n deferred until the Spanish version is polished.
- Feel hand-crafted, not template-y — inspired by the sites listed in `inspiration.md`.

## Non-Goals

- English translation. Skipped deliberately.
- Editable CMS / dynamic content. All copy is hardcoded in scene components — this is a thesis artifact, not a marketing page that marketing will edit.
- Dashboard / auth integration. The page is fully public, no auth state read.
- Replacing the current landing at `/`. This only touches `/about`.

## Narrative Structure (8 scenes)

| # | Scene | Intent | Key visual |
|---|---|---|---|
| 1 | Pitch + problem | Hook + one-line pitch + team credit + fragmented-ecosystem tease | Beams BG, giant logo that shrinks into header on scroll |
| 2 | Logo draw beat | Brand moment, buys a breath between pitch and content | SVG stroke-on animation of the Pelú logo + typed wordmark |
| 3 | Competencia | Differentiate from PetBacker; show PetTransportRD + PetPickup already integrated | 3 competitor cards, badge slide-ins, differentiator payoff |
| 4 | 3 Segmentos + empathy maps | Market understanding (Laura / Carlos / María) | Stacked cards, clockwise empathy-map reveal per segment |
| 5 | Planes | Pricing strategy (Básico / Intermedio / Premium / Flexible) | Radial circle layout, hover-expand per plan |
| 6 | Lean Canvas | Business-model summary in one glance | 5-col mini Lean Canvas, hover-expand column |
| 7 | Números | Investment & operational cost credibility | Counter-up metrics |
| 8 | CTA | Close the narrative, route to `/pets` | Closing headline + footer handoff |

### Scene copy (final, Spanish)

**Scene 1 — Pitch**
- Headline: `Pelú`
- Subhead: `Centralizamos el ecosistema de adopción y cuidado de mascotas en República Dominicana.`
- Problem beat (appears after initial fade): `Hoy está fragmentado. Nosotros lo organizamos.`
- Team line (bottom): `Alexander Tejeda · Maria Francisco · Nataly Corporan`
- CTA hint (bottom, tiny): `Desliza para conocer más ↓`

**Scene 2 — Logo draw**
- Body text: none (pure visual beat)
- Duration: ~1 viewport of scroll

**Scene 3 — Competencia**
- Section label: `LA COMPETENCIA`
- Three cards:
  - **PetBacker** — `Plataforma global que conecta individuos con cuidadores independientes. Formularios largos, confianza construida a base de reseñas entre desconocidos.`
  - **PetTransportRD** — `Transporte especializado de mascotas en RD. Tarifas por ruta.` Badge: `✓ Integrado en Pelú`
  - **PetPickup** — `Transporte urbano e interurbano. Tarifa adicional si el dueño acompaña.` Badge: `✓ Integrado en Pelú`
- Differentiator payoff (slides in after cards settle): `PetBacker conecta individuos con formularios largos. Pelú empieza con negocios verificados — cero fricción, confianza respaldada por evidencia real.`

**Scene 4 — Segmentos + empathy maps**
- Section label: `A QUIÉN SERVIMOS`
- Three sub-scenes stacked vertically inside one pinned scroll scene:
  - **Segmento A — Laura, 24, Joven digital sin mascota** (color: navy `oklch(25.8% 0.092 264)`)
  - **Segmento B — Carlos, 26, Joven dueño comprometido** (color: zinc `oklch(40% 0.01 286)`)
  - **Segmento C — María, 52, Adulto familiar tradicional** (color: amber `oklch(70% 0.15 65)`)
- Per-segment empathy map text (sourced verbatim from `pelu.pdf` pages 15-17):
  - Piensa y siente, Ve, Oye, Dice y hace, Le duele, Aspira — condensed to one short line each per quadrant

**Scene 5 — Planes**
- Section label: `LOS PLANES`
- Center label: `Pelú`
- 4 plans arranged radially:
  - **Básico** — `Gratis 6 meses · luego RD$2,499/mes` · `1 transporte · soporte email`
  - **Intermedio** — `RD$2,999/mes (intro) · regular RD$4,999` · `3 transportes · chat prioritario · perfil destacado`
  - **Premium** — `RD$5,999/mes (intro) · regular RD$8,999` · `5 transportes · soporte 24/7 · perfil verificado`
  - **Flexible** — `Pago por uso` · `Sin comisión primeros 3 meses`

**Scene 6 — Lean Canvas**
- Section label: `EL MODELO`
- 9 blocks in 5-column layout matching the standard Lean Canvas grid
- Content condensed from `pelu.pdf` page 18 — each block one short paragraph, full text revealed on hover/tap
- Blocks: Socios Clave · Actividades · Propuesta de Valor · Relación · Segmentos · Recursos · Canales · Costos · Ingresos

**Scene 7 — Números**
- Section label: `LOS NÚMEROS`
- Four metrics with counter-up animation:
  - `RD$45,112` — `Inversión inicial`
  - `~USD$130/mes` — `Gastos operativos`
  - `41` — `Encuestados en el estudio de mercado`
  - `3` — `Segmentos identificados`

**Scene 8 — CTA**
- Headline: `Pelú está vivo`
- Body: `Explora las mascotas disponibles para adopción hoy.`
- Primary CTA: `Ver mascotas` → `/pets`
- Secondary text: `Proyecto de tesis · PUCMM · 2026`
- Footer handoff (existing site footer resumes below)

## Architecture

### File layout

```
app/about/page.tsx                              # server component, metadata + <ScrollStory />
components/about/scroll-story.tsx               # client, GSAP registration, renders scenes
components/about/scenes/
  scene-01-pitch.tsx
  scene-02-logo-draw.tsx
  scene-03-competition.tsx
  scene-04-segments.tsx
  scene-05-plans.tsx
  scene-06-lean-canvas.tsx
  scene-07-numbers.tsx
  scene-08-cta.tsx
components/about/empathy-map.tsx                # reusable: character + clockwise reveal
components/about/header-bridge-context.tsx      # shared motion value for scene-1 → header handoff
lib/about/gsap-register.ts                      # one-time ScrollTrigger.register() + cleanup helper
lib/about/use-reduced-motion.ts                 # prefers-reduced-motion hook + global gate
lib/about/use-breakpoint.ts                     # desktop-vs-mobile gate for pinning fallback
public/assets/about/empathy/
  segment-a-character.svg                      # already dropped by user
  segment-b-character.svg                      # already dropped by user
  segment-c-character.svg                      # already dropped by user
```

### Component responsibilities

- **`app/about/page.tsx`** — server component. Sets metadata (title, description, OG image). Renders `<ScrollStory />`. No data fetching.
- **`scroll-story.tsx`** — top-level client component. Registers `gsap.registerPlugin(ScrollTrigger)` once in `useEffect`. Provides `HeaderBridgeContext`. Renders all 8 scenes in order. Cleans up all ScrollTriggers on unmount.
- **`scene-XX-*.tsx`** — each scene owns its own `useGSAP` / `useEffect` hook that creates ScrollTrigger(s) scoped to its own section element via a ref. Never reaches outside its own section.
- **`empathy-map.tsx`** — takes props `{ character: 'a' | 'b' | 'c', segmentName, personaBlurb, quadrants: { piensa, ve, oye, dice, duele, aspira }, color }`. Renders character at center inside an SVG, 6 radiating lines, 6 text labels. Exposes a `playTimeline(tl: gsap.core.Timeline)` method so the parent scene can stitch three maps into one master timeline.
- **`header-bridge-context.tsx`** — provides a shared `MotionValue<number>` (0..1) representing scene-1 scroll progress. Scene 1 writes to it. The global `Header` component reads from it on `/about` only and hides itself when progress < threshold, fading in past threshold. Also drives the logo's scale/position interpolation toward the header-logo slot coordinates.

### Scroll mechanics

- Each scene is a `<section>` with `min-height: 100vh` (desktop) or natural height (mobile).
- ScrollTrigger config per pinned scene:
  ```ts
  ScrollTrigger.create({
    trigger: sceneRef.current,
    start: 'top top',
    end: '+=100%',          // one extra viewport of scroll drives the internal timeline
    pin: true,
    scrub: 1,
    animation: sceneTimeline,
  })
  ```
- Total page height (desktop): ≈ 8 × 200vh = 16 viewports. Roughly 30-40 seconds of scroll at a natural pace.
- Scenes are in DOM order; no portal magic. Scroll is native — GSAP never hijacks wheel events.

### Header handoff (scene 1)

The existing global `<Header>` renders on every route. On `/about` it subscribes to `HeaderBridgeContext`:

```tsx
const progress = useHeaderBridge() // 0..1
const opacity = useTransform(progress, [0, 0.7], [0, 1])
// header is invisible for first 70% of scene 1, fades in during last 30%
```

Scene 1 meanwhile drives the giant logo with the same motion value:
- `scale: progress → 1 → 0.08`
- `x, y: progress → center → header-slot coords`
- `opacity: progress → 1 → 0` (handoff completes as header opacity hits 1)

The net effect: as the user scrolls, the giant centered logo visibly shrinks and flies up into the header's logo slot, and the header fades in behind it. No duplicate logo on screen at any moment.

### Empathy map reveal

`empathy-map.tsx` internal timeline (normalized 0..1):

| Range | What animates |
|---|---|
| 0.00–0.15 | Character SVG: opacity 0→1, scale 0.6→1.0, positioned dead center |
| 0.15–0.25 | Circular frame draws around character (`stroke-dasharray` animation on `<circle>`) |
| 0.25–0.35 | Line 1 (¿Qué piensa y siente?) extends from center to 12 o'clock; label + body fade in |
| 0.35–0.45 | Line 2 (¿Qué ve?) extends to 2 o'clock; label + body fade in |
| 0.45–0.55 | Line 3 (¿Qué oye?) extends to 4 o'clock; label + body fade in |
| 0.55–0.65 | Line 4 (¿Qué dice y hace?) extends to 6 o'clock; label + body fade in |
| 0.65–0.75 | Line 5 (¿Qué le duele?) extends to 8 o'clock; label + body fade in |
| 0.75–0.85 | Line 6 (¿A qué aspira?) extends to 10 o'clock; label + body fade in |
| 0.85–1.00 | Settle — full map holds |

All line reveals use `stroke-dashoffset` on SVG `<line>` elements. All label text uses `opacity + translateY(8px → 0)`.

Scene 4 composes three empathy maps in sequence inside one pinned scroll scene. The master timeline plays map A (0.00–0.33), fades it out + shifts up, plays map B (0.33–0.66), fades it out + shifts up, plays map C (0.66–1.00). Only one map is on screen at a time.

### Lean Canvas hover-expand

Implemented with Framer Motion `layout` animation, not GSAP:

```tsx
<motion.div layout className="grid grid-cols-5 gap-2">
  {blocks.map(b => (
    <motion.div layout key={b.id}
      className={cn(
        'rounded-2xl bg-zinc-900/5 p-4 transition-all',
        hoveredId === b.id && 'flex-[3]'
      )}
      onMouseEnter={() => setHoveredId(b.id)}
      onMouseLeave={() => setHoveredId(null)}
    >
      <h4>{b.title}</h4>
      <p>{hoveredId === b.id ? b.fullText : b.shortText}</p>
    </motion.div>
  ))}
</motion.div>
```

Framer's layout animation handles the FLIP reflow. No GSAP needed for this scene — it's a hover interaction, not a scroll interaction.

On mobile (no hover): the grid becomes a single column with all blocks fully expanded by default. No interaction needed.

### Plans radial layout (scene 5)

CSS approach: absolutely positioned cards around a center using `transform: rotate(Nturn) translate(Xpx) rotate(-Nturn)` so each card stays upright while being placed on a circle.

```tsx
const plans = [
  { name: 'Básico', angle: 0 },
  { name: 'Intermedio', angle: 0.25 },
  { name: 'Premium', angle: 0.5 },
  { name: 'Flexible', angle: 0.75 },
]
```

On scroll-in: each plan animates from the center outward, lines drawing between the center and each card. On hover: that plan card scales up and reveals its detailed features; others dim slightly.

Mobile fallback: 2x2 grid, no radial positioning, no lines. Static.

## Technology choices

### GSAP + ScrollTrigger

- **Why:** industry standard for pinned scrollytelling. Handles `pin: true, scrub: 1` out of the box. Hand-rolling this in framer-motion for 8 scenes is more code and fragile.
- **Bundle cost:** ~50KB gzipped for `gsap` + `ScrollTrigger`. Lazy-loaded via dynamic import in `scroll-story.tsx` so the page's initial paint doesn't pay the cost.
- **License:** GSAP (including ScrollTrigger) is free for this use case under its current license. Verify the current terms at `gsap.com` before merging; if anything has changed, fall back to the framer-motion-only approach — the structure of the spec still holds, only the animation primitives change.

### Framer Motion / motion (already installed)

- Kept for: small interactions (hover states, Lean Canvas layout animation, testimonial carousel elsewhere in the app)
- Also kept for: the header-bridge `MotionValue` which GSAP can still read via an imperative bridge (`useMotionValueEvent`)

### Next.js 16 + static export

- `next.config.js` currently has `output: 'export'`. This page must be fully static at build time.
- No `getServerSideProps`-style APIs. All content hardcoded in scene components.
- GSAP registration happens in `useEffect`, not at module top level, so it doesn't run during prerender.

## Mobile fallback (<md breakpoint)

- **Detection:** `useBreakpoint()` hook reading `window.matchMedia('(min-width: 768px)')`. Renders a different branch of the component tree.
- **Behavior:** no pinning, no scrub. Each scene becomes a normal stacked section with intersection-observer-triggered entry animations (fade + translate, ~400ms each). Scroll feels native, not choreographed.
- **Scenes that change:**
  - Scene 1: logo doesn't fly to header — it just fades and shrinks in place, header is always visible on mobile
  - Scene 4: empathy maps stack vertically, one per screen, no clockwise reveal — entire map fades in as a unit
  - Scene 5: plans in 2x2 grid, no radial positioning
  - Scene 6: Lean Canvas in single column, all blocks expanded
- **Rationale:** mobile Safari's address-bar resize breaks `100vh` pins intermittently, and scrub on touch devices stutters. Fallback is cheaper than fighting these bugs in front of a stakeholder.

## Accessibility

- `prefers-reduced-motion: reduce` → behaves like mobile fallback on all breakpoints. No scrub, no pinning, intersection-observer fades only.
- Every scene has a proper heading (`<h1>` on scene 1, `<h2>` on scenes 2-8) in document order — screen readers get a normal article.
- CTAs (`Ver mascotas`) are real `<a>` tags, keyboard-focusable.
- Character SVGs have `<title>` elements naming the persona.
- No scroll-hijacking. Users can Page Down / End / arrow keys normally.

## Performance

- Initial JS payload: dynamic-import GSAP so it's not in the first chunk. Scene 1 + pitch text are in the first paint.
- `will-change: transform` only on elements currently animating, added/removed via GSAP's built-in optimization.
- Empathy map SVGs are already in `public/assets/about/empathy/` — served as static files, cached by the CDN.
- Image optimization: n/a (no raster images in the scroller — everything is SVG or code).
- Target: Lighthouse Performance ≥ 90 on desktop, ≥ 80 on mobile (fallback helps here).

## SEO / metadata

`app/about/page.tsx` exports:

```tsx
export const metadata = {
  title: 'Pelú — Plataforma de adopción y cuidado de mascotas en RD',
  description: 'Centralizamos el ecosistema de adopción y cuidado de mascotas en República Dominicana. Proyecto de tesis — PUCMM 2026.',
  openGraph: {
    title: 'Pelú',
    description: 'Centralizamos el ecosistema de adopción y cuidado de mascotas en RD.',
    images: ['/assets/logo.svg'], // placeholder — designed OG image is follow-up work, see Out of scope
  },
}
```

## Testing

- **Manual (primary):** desktop Chrome + Firefox + Safari, mobile Safari + Chrome Android. Each scene verified: pin fires, internal timeline plays, release is clean, next scene enters.
- **Automated:** one Vitest + RTL smoke test per scene confirming it renders without crashing (`renderWithProviders` pattern). No animation assertions — RTL can't test scroll.
- **Reduced motion:** toggle `prefers-reduced-motion` in DevTools, confirm fallback path.

## Out of scope

- OG image generation. Will use an existing logo asset for now; a proper designed OG image is a follow-up task.
- Analytics / scroll-depth tracking. Not needed for thesis; can be added later if the page stays in production post-thesis.
- A/B testing different narratives. One narrative, committed.
- Translation to English. Locked to Spanish for this pass.
- Changing the existing `/` landing or `Header` component structure — we only *read* a context from the header, not modify its layout.

## Implementation notes for planning phase

The plan that comes out of this spec should sequence work as:
1. Scaffolding: page skeleton, GSAP install, scroll-story shell with 8 empty scenes, mobile fallback gate
2. Scene 1 + header bridge (the most architecturally complex — do this first to validate the pattern)
3. Scene 4 + empathy map component (second-most complex, establishes the reusable pattern)
4. Remaining scenes in narrative order (2, 3, 5, 6, 7, 8) — each should be trivial once the first two are done
5. Mobile fallback audit (all scenes tested on mobile)
6. Reduced-motion audit
7. Production polish: OG metadata, Lighthouse pass

Every scene is independent once the shell exists, so scenes 2-8 can be parallelized if needed.
