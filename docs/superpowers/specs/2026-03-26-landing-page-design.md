# Landing Page Redesign — Design Spec

**Date:** 2026-03-26
**Inspiration:** [hero231 by shadcnblocks](https://www.shadcnblocks.com/block/hero231)

## Goal

Create a new landing page at `/` that introduces Pelú's marketplace vision. The current `/about` page content stays intact under a renamed file. A shared footer component is extracted so all public pages feel cohesive.

## File Changes

### Renames

| Before | After |
|---|---|
| `components/landing/landing-page.tsx` | `components/landing/about-page.tsx` |
| `components/landing/header.tsx` | `components/header.tsx` |

### New Files

| File | Purpose |
|---|---|
| `components/landing/landing-page.tsx` | New hero landing page component |
| `components/footer.tsx` | Extracted shared footer |
| `components/landing/testimonial-carousel.tsx` | Forked from `Carousel.tsx`, adapted for testimonial cards |

### Modified Files

| File | Change |
|---|---|
| `app/page.tsx` | Render `<LandingPage />` instead of redirecting to `/pets` |
| `app/about/page.tsx` | Import from `about-page.tsx` instead of `landing-page.tsx` |
| `components/landing/about-page.tsx` | Replace inline footer with `<Footer />` component |
| `components/pets/pets-page.tsx` | Add `<Footer />` at bottom |
| `components/aliados/aliados-page.tsx` | Add `<Footer />` at bottom |

## Landing Page Sections

### 1. Header

Reuse `PetsHeader` as-is. No changes.

### 2. Hero Section (two-column split)

Full-width container with two columns. On mobile, stacks vertically (left on top, right below).

**Left column — Copy:**
- **Badge pill:** Rounded pill with a small pop-550 dot + text "Un ecosistema para tus mascotas". Styled: `bg-muted border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground`.
- **Title:** `h1`, large bold text: "Encuentra y cuida a tu compañero". Styled: `text-4xl md:text-5xl font-extrabold leading-tight`.
- **Subtitle:** Short marketplace description: "Pelú conecta adoptantes, centros de rescate y negocios en un solo lugar — para que cada mascota encuentre un hogar." Styled: `text-muted-foreground text-base max-w-md`.
- **Two CTA buttons:**
  - "Ver mascotas" — outline variant, links to `/pets`
  - "Registrarse" — solid pop-550 variant, links to `/auth/register`
  - Both have an arrow icon (FontAwesome `faArrowRight`) that starts rotated -45deg and animates to 0deg on hover via Tailwind `group-hover:rotate-0 transition-transform`.

**Right column — Logo marquee + Testimonial carousel:**
- **Logo marquee:** `LogoLoop` component positioned above the carousel. Compact size (small logos, `text-xs`). Uses 6-8 placeholder SVG logos from logoipsum. Faded opacity (`opacity-40`). Same width as the carousel below it.
- **Testimonial carousel:** `TestimonialCarousel` component (see section below). Includes dot indicators centered beneath.

### 3. "Cómo funciona" Section

Centered layout with heading, subtitle, and 3 cards in a row.

- **Heading:** "Cómo funciona" (`text-2xl md:text-3xl font-bold`)
- **Subtitle:** "Tres pasos para cambiar una vida" (`text-muted-foreground text-sm`)
- **Cards** (3, equal width, `rounded-2xl border border-border bg-card`):
  1. **Busca** — `faMagnifyingGlass` icon, "Explora mascotas disponibles de centros de rescate verificados"
  2. **Adopta** — `faPaw` icon, "Completa el formulario de adopción y conecta con el rescate"
  3. **Transporta** — `faTruckFast` icon, "Coordina el transporte seguro hasta tu hogar con nuestros aliados"
- Icon containers: `rounded-xl bg-pop-550/10` with `text-pop-550` icon color
- On mobile: single column stack

### 4. Footer

Extracted from current `landing-page.tsx` (lines 228-254). Same content and layout:
- Left: Pelú branding + tagline
- Columns: Sobre (Nosotros, Contacto), Legal (Privacidad, Términos)
- Bottom: copyright line
- Responsive: 1 col mobile, multi-col desktop

## TestimonialCarousel Component

**Based on:** `components/Carousel.tsx` (Framer Motion drag carousel with coverflow)

**Key differences from base Carousel:**

| Feature | Base Carousel | TestimonialCarousel |
|---|---|---|
| Content | Images or custom cards | Structured testimonial cards |
| Height | Fixed | Animated — center card taller |
| Scale | rotateY + scale | rotateY + scale + height interpolation |
| Card template | Generic | Quote mark + text + avatar + name/role |

**Card structure:**
```
┌─────────────────┐
│  "              │  ← Quote mark (text-pop-550 for center, text-muted for sides)
│                 │
│  Testimonial    │  ← Quote text (text-sm text-muted-foreground)
│  text here...   │
│                 │
│  ○ Name         │  ← Avatar circle + name + role
│    Role         │
└─────────────────┘
```

**Animation behavior:**
- **Center card:** height ~260px, scale(1), opacity 1, subtle `border-pop-550/25` + `shadow-pop-550/10` glow
- **Adjacent cards:** height ~210px, scale(0.88), opacity 0.5, `rotateY(±8deg)`, neutral border
- **Height transition:** Smooth interpolation via Framer Motion's `animate` prop as cards move in/out of center position
- **Autoplay:** Yes, with pause on hover
- **Drag/swipe:** Yes, velocity-based (same as base Carousel)
- **Loop:** Yes, seamless wrapping
- **Dot indicators:** Centered below carousel, pop-550 for active dot

**Placeholder testimonials (5-6):**
Each has: name, role (Adoptante / Centro de Rescate / Aliado), and placeholder quote text. Content is hardcoded for now — no API needed.

## i18n

All user-facing strings go through react-i18next. New keys added to the existing `landing` namespace:
- `public/locales/es/landing.json`
- `public/locales/en/landing.json`

Key groups: `hero.badge`, `hero.title`, `hero.subtitle`, `hero.cta_pets`, `hero.cta_register`, `how.title`, `how.subtitle`, `how.search.*`, `how.adopt.*`, `how.transport.*`

Note: the `landing` namespace already exists and is registered. New keys are added alongside existing ones.

## Mobile Responsive

- Hero: stacks vertically (copy block on top, marquee + carousel below)
- Logo marquee: stays above carousel in stacked layout
- "Cómo funciona" cards: single column
- Footer: existing responsive behavior (already handles mobile)

## What Is NOT In Scope

- Real testimonial data or API endpoints
- Real partner logos (placeholder SVGs only)
- Changes to PetsHeader component
- Changes to existing Carousel.tsx
- Any new i18n namespaces (reuse `landing`)
