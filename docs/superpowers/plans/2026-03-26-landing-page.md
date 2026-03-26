# Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new hero landing page at `/` inspired by hero231, extract a shared footer, and reorganize shared layout components.

**Architecture:** New `landing-page.tsx` with hero split (copy + testimonial carousel), logo marquee via existing LogoLoop, "Cómo funciona" section, and shared Footer. Current landing page renamed to `about-page.tsx`. TestimonialCarousel forked from existing Carousel.tsx with height animation.

**Tech Stack:** Next.js App Router, React 19, Framer Motion, react-i18next, TailwindCSS, FontAwesome, LogoLoop (react-bits)

**Spec:** `docs/superpowers/specs/2026-03-26-landing-page-design.md`

---

### Task 1: Extract Footer Component

**Files:**
- Create: `components/footer.tsx`
- Modify: `components/landing/landing-page.tsx:228-254` (remove inline footer)

- [ ] **Step 1: Create `components/footer.tsx`**

Extract the footer from the current landing page into its own component:

```tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation('landing')

  return (
    <footer className="py-12 px-4 bg-primary text-muted-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-2xl font-bold text-primary-foreground mb-2">Pelú</div>
            <p className="text-sm">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">{t('footer.about')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-primary-foreground transition-colors">{t('footer.about')}</Link></li>
              <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.contact')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.terms')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border text-center text-sm">
          {t('footer.rights')}
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `bun run lint`
Expected: No errors related to `components/footer.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/footer.tsx
git commit -m "refactor: extract Footer into components/footer.tsx"
```

---

### Task 2: Rename landing-page.tsx → about-page.tsx and move header.tsx

**Files:**
- Rename: `components/landing/landing-page.tsx` → `components/landing/about-page.tsx`
- Rename: `components/landing/header.tsx` → `components/header.tsx`
- Modify: `app/about/page.tsx`
- Modify: `components/landing/about-page.tsx` (replace inline footer with `<Footer />`)

- [ ] **Step 1: Rename files via git mv**

```bash
git mv components/landing/landing-page.tsx components/landing/about-page.tsx
git mv components/landing/header.tsx components/header.tsx
```

- [ ] **Step 2: Update `components/landing/about-page.tsx`**

Change the export name and replace inline footer with `<Footer />`:

1. Add import at top: `import { Footer } from '@/components/footer'`
2. Replace the entire `<footer>...</footer>` block (lines 228-254 of original) with `<Footer />`
3. Rename the export from `LandingPage` to `AboutPage`

The component should now look like:
```tsx
export function AboutPage() {
  // ... existing code unchanged ...

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        {/* ... existing CTA section ... */}
      </section>

      <Footer />
    </div>
  )
}
```

- [ ] **Step 3: Update `app/about/page.tsx`**

```tsx
import { AboutPage } from '@/components/landing/about-page'

export default function About() {
  return <AboutPage />
}
```

- [ ] **Step 4: Verify**

Run: `bun run lint`
Expected: No errors. The `/about` page should render correctly.

- [ ] **Step 5: Commit**

```bash
git add components/landing/about-page.tsx components/header.tsx app/about/page.tsx
git commit -m "refactor: rename landing-page to about-page, move header to components root"
```

---

### Task 3: Add Footer to /pets and /aliados pages

**Files:**
- Modify: `components/pets/pets-page.tsx`
- Modify: `components/aliados/aliados-page.tsx`

- [ ] **Step 1: Add Footer to `components/pets/pets-page.tsx`**

1. Add import: `import { Footer } from '@/components/footer'`
2. Add `<Footer />` as the last child inside the outermost `<div>`, after the Sheet/Drawer components

- [ ] **Step 2: Add Footer to `components/aliados/aliados-page.tsx`**

1. Add import: `import { Footer } from '@/components/footer'`
2. Add `<Footer />` as the last child inside the outermost `<div>`, after the Sheet/Drawer components

- [ ] **Step 3: Verify**

Run: `bun run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/pets/pets-page.tsx components/aliados/aliados-page.tsx
git commit -m "feat: add shared Footer to /pets and /aliados pages"
```

---

### Task 4: Add i18n keys for the new landing page

**Files:**
- Modify: `public/locales/es/landing.json`
- Modify: `public/locales/en/landing.json`

- [ ] **Step 1: Add Spanish keys to `public/locales/es/landing.json`**

Add these keys at the top level (alongside existing `hero`, `problem`, etc.):

```json
{
  "new_hero": {
    "badge": "Un ecosistema para tus mascotas",
    "title": "Encuentra y cuida a tu compañero",
    "subtitle": "Pelú conecta adoptantes, centros de rescate y negocios en un solo lugar — para que cada mascota encuentre un hogar.",
    "cta_pets": "Ver mascotas",
    "cta_register": "Registrarse"
  },
  "how": {
    "title": "Cómo funciona",
    "subtitle": "Tres pasos para cambiar una vida",
    "search": {
      "title": "Busca",
      "description": "Explora mascotas disponibles de centros de rescate verificados"
    },
    "adopt": {
      "title": "Adopta",
      "description": "Completa el formulario de adopción y conecta con el rescate"
    },
    "transport": {
      "title": "Transporta",
      "description": "Coordina el transporte seguro hasta tu hogar con nuestros aliados"
    }
  },
  "testimonials": {
    "placeholder_1": { "quote": "Adoptar a Luna fue la mejor decisión. El proceso fue súper sencillo.", "name": "María G.", "role": "Adoptante" },
    "placeholder_2": { "quote": "Pelú nos ayudó a encontrar hogares para más de 50 mascotas.", "name": "Rescate RD", "role": "Centro de Rescate" },
    "placeholder_3": { "quote": "El transporte llegó a tiempo y mi mascota estaba segura.", "name": "Carlos P.", "role": "Adoptante" },
    "placeholder_4": { "quote": "Como negocio aliado, hemos crecido junto a la plataforma.", "name": "PetCare SD", "role": "Aliado" },
    "placeholder_5": { "quote": "La adopción debería ser siempre así de fácil.", "name": "Ana R.", "role": "Adoptante" }
  }
}
```

Note: Merge these into the existing JSON — don't replace existing keys.

- [ ] **Step 2: Add English keys to `public/locales/en/landing.json`**

```json
{
  "new_hero": {
    "badge": "An ecosystem for your pets",
    "title": "Find and care for your companion",
    "subtitle": "Pelú connects adopters, rescue centers, and businesses in one place — so every pet finds a home.",
    "cta_pets": "Browse pets",
    "cta_register": "Sign up"
  },
  "how": {
    "title": "How it works",
    "subtitle": "Three steps to change a life",
    "search": {
      "title": "Search",
      "description": "Explore available pets from verified rescue centers"
    },
    "adopt": {
      "title": "Adopt",
      "description": "Complete the adoption form and connect with the rescue center"
    },
    "transport": {
      "title": "Transport",
      "description": "Coordinate safe transport to your home with our partners"
    }
  },
  "testimonials": {
    "placeholder_1": { "quote": "Adopting Luna was the best decision. The process was super easy.", "name": "María G.", "role": "Adopter" },
    "placeholder_2": { "quote": "Pelú helped us find homes for over 50 pets.", "name": "Rescate RD", "role": "Rescue Center" },
    "placeholder_3": { "quote": "The transport arrived on time and my pet was safe.", "name": "Carlos P.", "role": "Adopter" },
    "placeholder_4": { "quote": "As a partner business, we've grown alongside the platform.", "name": "PetCare SD", "role": "Partner" },
    "placeholder_5": { "quote": "Adoption should always be this easy.", "name": "Ana R.", "role": "Adopter" }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/locales/es/landing.json public/locales/en/landing.json
git commit -m "feat: add i18n keys for new landing page hero, how-it-works, testimonials"
```

---

### Task 5: Create TestimonialCarousel component

**Files:**
- Create: `components/landing/testimonial-carousel.tsx`

This is a fork of `components/Carousel.tsx` adapted for testimonial cards with height animation. The key changes from the base carousel are:

1. Cards render testimonial content (quote, name, role) instead of images
2. Center card animates taller (~260px) than side cards (~210px)
3. Center card has pop-550 accent glow
4. Styling uses semantic color tokens

- [ ] **Step 1: Create `components/landing/testimonial-carousel.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons'

export interface Testimonial {
  id: number
  quote: string
  name: string
  role: string
}

interface TestimonialCarouselProps {
  items: Testimonial[]
  baseWidth?: number
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
}

const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const GAP = 16
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 }

const CENTER_HEIGHT = 260
const SIDE_HEIGHT = 210

interface CardProps {
  item: Testimonial
  index: number
  itemWidth: number
  trackItemOffset: number
  x: any
  transition: any
}

function TestimonialCard({ item, index, itemWidth, trackItemOffset, x, transition }: CardProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset]

  const rotateY = useTransform(x, range, [12, 0, -12], { clamp: false })
  const scale = useTransform(x, range, [0.88, 1, 0.88], { clamp: false })
  const opacity = useTransform(x, range, [0.5, 1, 0.5], { clamp: false })
  const height = useTransform(x, range, [SIDE_HEIGHT, CENTER_HEIGHT, SIDE_HEIGHT], { clamp: false })
  const borderOpacity = useTransform(x, range, [0, 0.25, 0], { clamp: false })
  const shadowOpacity = useTransform(x, range, [0, 0.1, 0], { clamp: false })

  return (
    <motion.div
      className="relative shrink-0 flex flex-col justify-between bg-card border border-border rounded-2xl p-5 cursor-grab active:cursor-grabbing overflow-hidden"
      style={{
        width: itemWidth,
        height,
        rotateY,
        scale,
        opacity,
        borderColor: useTransform(borderOpacity, v => `oklch(69.6% 0.17 13.29 / ${v})`),
        boxShadow: useTransform(shadowOpacity, v => `0 0 30px oklch(69.6% 0.17 13.29 / ${v})`),
      }}
      transition={transition}
    >
      <FontAwesomeIcon icon={faQuoteLeft} className="text-2xl text-pop-550/70" />
      <p className="text-sm text-muted-foreground leading-relaxed mt-3 flex-1">
        {item.quote}
      </p>
      <div className="flex items-center gap-2 mt-4">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {item.name.charAt(0)}
        </div>
        <div>
          <div className="text-xs font-medium text-foreground">{item.name}</div>
          <div className="text-[10px] text-muted-foreground">{item.role}</div>
        </div>
      </div>
    </motion.div>
  )
}

export function TestimonialCarousel({
  items,
  baseWidth = 520,
  autoplay = true,
  autoplayDelay = 4000,
  pauseOnHover = true,
}: TestimonialCarouselProps) {
  const containerPadding = 16
  const itemWidth = Math.round((baseWidth - containerPadding * 2) / 2.6)
  const trackItemOffset = itemWidth + GAP

  const itemsForRender = useMemo(() => {
    if (items.length === 0) return []
    return [items[items.length - 1], ...items, items[0]]
  }, [items])

  const [position, setPosition] = useState(1)
  const x = useMotionValue(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pauseOnHover || !containerRef.current) return
    const container = containerRef.current
    const enter = () => setIsHovered(true)
    const leave = () => setIsHovered(false)
    container.addEventListener('mouseenter', enter)
    container.addEventListener('mouseleave', leave)
    return () => {
      container.removeEventListener('mouseenter', enter)
      container.removeEventListener('mouseleave', leave)
    }
  }, [pauseOnHover])

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return
    if (pauseOnHover && isHovered) return

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1))
    }, autoplayDelay)

    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length])

  useEffect(() => {
    setPosition(1)
    x.set(-1 * trackItemOffset)
  }, [items.length, trackItemOffset, x])

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS

  const handleAnimationComplete = () => {
    if (itemsForRender.length <= 1) { setIsAnimating(false); return }
    const lastCloneIndex = itemsForRender.length - 1

    if (position === lastCloneIndex) {
      setIsJumping(true)
      setPosition(1)
      x.set(-1 * trackItemOffset)
      requestAnimationFrame(() => { setIsJumping(false); setIsAnimating(false) })
      return
    }
    if (position === 0) {
      setIsJumping(true)
      const target = items.length
      setPosition(target)
      x.set(-target * trackItemOffset)
      requestAnimationFrame(() => { setIsJumping(false); setIsAnimating(false) })
      return
    }
    setIsAnimating(false)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD ? -1
          : 0
    if (direction === 0) return
    setPosition(prev => {
      const next = prev + direction
      return Math.max(0, Math.min(next, itemsForRender.length - 1))
    })
  }

  const activeIndex = items.length === 0 ? 0 : (position - 1 + items.length) % items.length

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ width: `${baseWidth}px` }}
      >
        <motion.div
          className="flex"
          drag={isAnimating ? false : 'x'}
          style={{
            width: itemWidth,
            gap: `${GAP}px`,
            perspective: 1000,
            perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
            x,
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: -(position * trackItemOffset) }}
          transition={effectiveTransition}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={handleAnimationComplete}
        >
          {itemsForRender.map((item, index) => (
            <TestimonialCard
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              itemWidth={itemWidth}
              trackItemOffset={trackItemOffset}
              x={x}
              transition={effectiveTransition}
            />
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mt-4">
        {items.map((_, index) => (
          <motion.div
            key={index}
            className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-150 ${
              activeIndex === index ? 'bg-pop-550' : 'bg-muted-foreground/30'
            }`}
            animate={{ scale: activeIndex === index ? 1.2 : 1 }}
            onClick={() => setPosition(index + 1)}
            transition={{ duration: 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/landing/testimonial-carousel.tsx
git commit -m "feat: add TestimonialCarousel component forked from Carousel"
```

---

### Task 6: Create the new Landing Page component

**Files:**
- Create: `components/landing/landing-page.tsx`

- [ ] **Step 1: Download placeholder logo SVGs**

Save 6 placeholder SVG logos from logoipsum into `public/assets/logos/`. These are simple SVG files for the marquee:

```bash
mkdir -p public/assets/logos
```

Create 6 simple placeholder SVG files (partner-1.svg through partner-6.svg). Each should be a minimal logo placeholder — you can use inline SVGs or download from logoipsum.com. Example minimal placeholder:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="30" viewBox="0 0 120 30">
  <rect width="120" height="30" rx="4" fill="#333"/>
  <text x="60" y="20" text-anchor="middle" fill="#888" font-size="12" font-family="system-ui">Partner N</text>
</svg>
```

Create `partner-1.svg` through `partner-6.svg` with the text "Partner 1" through "Partner 6".

- [ ] **Step 2: Create `components/landing/landing-page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faMagnifyingGlass, faPaw, faTruckFast } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { Footer } from '@/components/footer'
import { LogoLoop } from '@/components/LogoLoop'
import { TestimonialCarousel, Testimonial } from '@/components/landing/testimonial-carousel'

const PARTNER_LOGOS = [
  { src: '/assets/logos/partner-1.svg', alt: 'Partner 1' },
  { src: '/assets/logos/partner-2.svg', alt: 'Partner 2' },
  { src: '/assets/logos/partner-3.svg', alt: 'Partner 3' },
  { src: '/assets/logos/partner-4.svg', alt: 'Partner 4' },
  { src: '/assets/logos/partner-5.svg', alt: 'Partner 5' },
  { src: '/assets/logos/partner-6.svg', alt: 'Partner 6' },
]

const HOW_STEPS = [
  { icon: faMagnifyingGlass, titleKey: 'how.search.title', descKey: 'how.search.description' },
  { icon: faPaw, titleKey: 'how.adopt.title', descKey: 'how.adopt.description' },
  { icon: faTruckFast, titleKey: 'how.transport.title', descKey: 'how.transport.description' },
]

export function LandingPage() {
  const { t } = useTranslation('landing')

  const testimonials: Testimonial[] = [1, 2, 3, 4, 5].map(i => ({
    id: i,
    quote: t(`testimonials.placeholder_${i}.quote`),
    name: t(`testimonials.placeholder_${i}.name`),
    role: t(`testimonials.placeholder_${i}.role`),
  }))

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      {/* Hero */}
      <section className="px-4 pt-12 pb-16">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row gap-12 md:gap-8 items-center">
          {/* Left — Copy */}
          <div className="flex-1 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground mb-5">
              <span className="w-2 h-2 rounded-full bg-pop-550" />
              {t('new_hero.badge')}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              {t('new_hero.title')}
            </h1>
            <p className="text-muted-foreground text-base max-w-md mb-8">
              {t('new_hero.subtitle')}
            </p>
            <div className="flex gap-3">
              <Link
                href="/pets"
                className="group inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:border-muted-foreground transition-colors"
              >
                {t('new_hero.cta_pets')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </Link>
              <Link
                href="/auth/register"
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-pop-550 text-white rounded-xl text-sm font-medium hover:bg-pop-500 transition-colors"
              >
                {t('new_hero.cta_register')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </Link>
            </div>
          </div>

          {/* Right — Marquee + Carousel */}
          <div className="flex-1 flex flex-col items-center w-full max-w-[520px]">
            <div className="w-full opacity-40 mb-4">
              <LogoLoop
                logos={PARTNER_LOGOS}
                logoHeight={20}
                gap={40}
                speed={60}
                pauseOnHover
                fadeOut
              />
            </div>
            <TestimonialCarousel items={testimonials} />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto max-w-6xl px-4">
        <div className="h-px bg-border" />
      </div>

      {/* How It Works */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('how.title')}</h2>
          <p className="text-muted-foreground text-sm mb-10">{t('how.subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 text-center">
                <div className="w-12 h-12 rounded-xl bg-pop-550/10 flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={step.icon} className="text-lg text-pop-550" />
                </div>
                <h3 className="text-base font-semibold mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `bun run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add public/assets/logos/ components/landing/landing-page.tsx
git commit -m "feat: create new hero landing page with testimonial carousel"
```

---

### Task 7: Wire up the root route

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace redirect with LandingPage render**

Replace the contents of `app/page.tsx`:

```tsx
import { LandingPage } from '@/components/landing/landing-page'

export default function Home() {
  return <LandingPage />
}
```

- [ ] **Step 2: Verify**

Run: `bun run lint`
Expected: No errors. Navigate to `http://localhost:3000/` — should show the new hero landing page.

- [ ] **Step 3: Verify `/about` still works**

Navigate to `http://localhost:3000/about` — should show the original about page content with the shared Footer component.

- [ ] **Step 4: Verify `/pets` and `/aliados` show footer**

Navigate to both pages — they should now display the Footer at the bottom.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire root route to new landing page instead of /pets redirect"
```
