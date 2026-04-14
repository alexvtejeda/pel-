# About Route Scrollytelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/about` with an 8-scene pinned-scroll narrative that works as both a live-presentation tool and a permanent shareable pitch page.

**Architecture:** Next.js 16 App Router static-export page that dynamically loads GSAP + ScrollTrigger client-side to drive pinned per-scene timelines. Framer Motion handles small layout animations (Lean Canvas column expand) and a shared `MotionValue` bridge between scene 1 and the page-local header. Mobile and `prefers-reduced-motion` users get a fallback path with normal stacked sections and intersection-observer fade-ins — no pinning, no scrub.

**Tech Stack:**
- Next.js 16 (App Router, `output: 'export'`)
- React 19
- GSAP 3 + ScrollTrigger (new install, dynamic import)
- Framer Motion / motion (already installed)
- Tailwind v4 (theme tokens in `app/globals.css`)
- Font Awesome (existing icon library)
- Vitest + RTL (smoke tests only — scroll animations not unit-testable)

**Spec:** `docs/superpowers/specs/2026-04-13-about-scrollytelling-design.md` — read this first.

## Spec deviations (read before starting)

1. **No global Header modification.** The spec describes modifying a "global `<Header>` component"; in practice the site has no global header. Each page mounts `<PetsHeader />` itself (see `components/landing/about-page.tsx:26`). The scroll story's header bridge therefore exposes a local `<AboutHeader />` component inside `/about` only, rather than touching shared code. Everything else in the spec applies as-written.

2. **Character SVGs already present** at `public/assets/about/empathy/segment-{a,b,c}-character.svg`. Drop-in ready. Their `viewBox` is `0 0 37.5 37.5` — scale up in CSS.

3. **`components/landing/about-page.tsx` is deleted** at the end of this plan. The new page takes over the `/about` route entirely.

---

## File Structure

### Create

```
app/about/page.tsx                                  # replaced — server component, metadata + <ScrollStory />
app/about/layout.tsx                                # static metadata only (if not already present)
components/about/scroll-story.tsx                   # client, GSAP boot, scene sequencer
components/about/about-header.tsx                   # local header revealed by bridge
components/about/scenes/scene-01-pitch.tsx
components/about/scenes/scene-02-logo-draw.tsx
components/about/scenes/scene-03-competition.tsx
components/about/scenes/scene-04-segments.tsx
components/about/scenes/scene-05-plans.tsx
components/about/scenes/scene-06-lean-canvas.tsx
components/about/scenes/scene-07-numbers.tsx
components/about/scenes/scene-08-cta.tsx
components/about/empathy-map.tsx
components/about/header-bridge-context.tsx
components/about/counter-up.tsx                     # small shared helper for scene 7
lib/about/gsap-register.ts
lib/about/use-reduced-motion.ts
lib/about/use-breakpoint.ts
lib/about/empathy-content.ts                        # plain TS data: segment quadrant copy
lib/about/plans-content.ts                          # plain TS data: plan card copy
lib/about/lean-canvas-content.ts                    # plain TS data: canvas block copy
components/__tests__/about/use-reduced-motion.test.ts
components/__tests__/about/use-breakpoint.test.ts
components/__tests__/about/header-bridge-context.test.tsx
components/__tests__/about/empathy-map.test.tsx
components/__tests__/about/scenes.smoke.test.tsx
```

### Modify

- `package.json` — add `gsap` dependency
- `.gitignore` — ensure `.superpowers/` is listed (spec sessions leave files there)

### Delete (final task)

- `components/landing/about-page.tsx`
- Any i18n keys in `landing.json` used only by the old about page (identify in Task 22)

---

## Pre-flight

- [ ] **Step 0a: Confirm branch**

Run:
```bash
git branch --show-current
```
Expected: `about-scrollytelling`

If not on that branch, switch:
```bash
git checkout about-scrollytelling
```

- [ ] **Step 0b: Confirm character SVGs exist**

Run:
```bash
ls public/assets/about/empathy/
```
Expected output contains: `segment-a-character.svg`, `segment-b-character.svg`, `segment-c-character.svg`

---

## Task 1: Install GSAP

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install gsap**

Run:
```bash
bun add gsap
```
Expected: `gsap` added to `dependencies` in `package.json`, `bun.lock` updated.

- [ ] **Step 2: Verify import resolves**

Run:
```bash
bun --bun -e 'import("gsap").then(m => console.log(typeof m.gsap))'
```
Expected: `object`

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add gsap dependency for about scrollytelling"
```

---

## Task 2: `lib/about/gsap-register.ts` — idempotent ScrollTrigger registration

**Files:**
- Create: `lib/about/gsap-register.ts`
- Test: N/A (trivial wrapper, covered by scroll-story integration)

- [ ] **Step 1: Create the file**

`lib/about/gsap-register.ts`:
```ts
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

export function registerGsap() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

export function killAllScrollTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill())
}

export { gsap, ScrollTrigger }
```

- [ ] **Step 2: Commit**

```bash
git add lib/about/gsap-register.ts
git commit -m "feat(about): add gsap registration helper"
```

---

## Task 3: `lib/about/use-reduced-motion.ts`

**Files:**
- Create: `lib/about/use-reduced-motion.ts`
- Test: `components/__tests__/about/use-reduced-motion.test.ts`

- [ ] **Step 1: Write the failing test**

`components/__tests__/about/use-reduced-motion.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

describe('useReducedMotion', () => {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  let currentMatches = false

  beforeEach(() => {
    listeners.length = 0
    currentMatches = false
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() { return currentMatches },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    }))
  })

  it('returns false when reduced motion is not requested', () => {
    currentMatches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when reduced motion is requested', () => {
    currentMatches = true
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when the media query changes', () => {
    currentMatches = false
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => {
      currentMatches = true
      listeners.forEach((cb) => cb({ matches: true }))
    })
    expect(result.current).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/use-reduced-motion.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

`lib/about/use-reduced-motion.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
      setReduced(e.matches)
    }
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
  }, [])

  return reduced
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/about/use-reduced-motion.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/about/use-reduced-motion.ts components/__tests__/about/use-reduced-motion.test.ts
git commit -m "feat(about): add useReducedMotion hook with tests"
```

---

## Task 4: `lib/about/use-breakpoint.ts`

**Files:**
- Create: `lib/about/use-breakpoint.ts`
- Test: `components/__tests__/about/use-breakpoint.test.ts`

- [ ] **Step 1: Write the failing test**

`components/__tests__/about/use-breakpoint.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { useIsDesktop } from '@/lib/about/use-breakpoint'

describe('useIsDesktop', () => {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  let currentMatches = true

  beforeEach(() => {
    listeners.length = 0
    currentMatches = true
    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() { return currentMatches },
      media: '(min-width: 768px)',
      addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      },
    }))
  })

  it('returns true above md breakpoint', () => {
    currentMatches = true
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('returns false below md breakpoint', () => {
    currentMatches = false
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })

  it('updates on resize', () => {
    currentMatches = true
    const { result } = renderHook(() => useIsDesktop())
    act(() => {
      currentMatches = false
      listeners.forEach((cb) => cb({ matches: false }))
    })
    expect(result.current).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/use-breakpoint.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

`lib/about/use-breakpoint.ts`:
```ts
'use client'

import { useEffect, useState } from 'react'

const MD_QUERY = '(min-width: 768px)'

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(MD_QUERY)
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
      setIsDesktop(e.matches)
    }
    mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
    return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
  }, [])

  return isDesktop
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/about/use-breakpoint.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/about/use-breakpoint.ts components/__tests__/about/use-breakpoint.test.ts
git commit -m "feat(about): add useIsDesktop hook with tests"
```

---

## Task 5: `components/about/header-bridge-context.tsx`

**Files:**
- Create: `components/about/header-bridge-context.tsx`
- Test: `components/__tests__/about/header-bridge-context.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/__tests__/about/header-bridge-context.test.tsx`:
```tsx
import { render, screen, act } from '@testing-library/react'
import { HeaderBridgeProvider, useHeaderBridge } from '@/components/about/header-bridge-context'

function Consumer() {
  const bridge = useHeaderBridge()
  return (
    <>
      <div data-testid="progress">{bridge.progress.get()}</div>
      <button onClick={() => bridge.progress.set(0.5)}>set</button>
    </>
  )
}

describe('HeaderBridge', () => {
  it('provides progress=0 by default', () => {
    render(
      <HeaderBridgeProvider>
        <Consumer />
      </HeaderBridgeProvider>
    )
    expect(screen.getByTestId('progress').textContent).toBe('0')
  })

  it('updates progress when written', () => {
    render(
      <HeaderBridgeProvider>
        <Consumer />
      </HeaderBridgeProvider>
    )
    act(() => {
      screen.getByText('set').click()
    })
    expect(screen.getByTestId('progress').textContent).toBe('0.5')
  })

  it('throws if useHeaderBridge used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(/HeaderBridgeProvider/)
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/header-bridge-context.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the context**

`components/about/header-bridge-context.tsx`:
```tsx
'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { motionValue, MotionValue } from 'framer-motion'

type HeaderBridge = {
  progress: MotionValue<number>
}

const HeaderBridgeContext = createContext<HeaderBridge | null>(null)

export function HeaderBridgeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<HeaderBridge>(() => ({ progress: motionValue(0) }), [])
  return <HeaderBridgeContext.Provider value={value}>{children}</HeaderBridgeContext.Provider>
}

export function useHeaderBridge(): HeaderBridge {
  const ctx = useContext(HeaderBridgeContext)
  if (!ctx) throw new Error('useHeaderBridge must be used inside HeaderBridgeProvider')
  return ctx
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/about/header-bridge-context.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/about/header-bridge-context.tsx components/__tests__/about/header-bridge-context.test.tsx
git commit -m "feat(about): add header bridge context with MotionValue progress"
```

---

## Task 6: Content data modules

**Files:**
- Create: `lib/about/empathy-content.ts`
- Create: `lib/about/plans-content.ts`
- Create: `lib/about/lean-canvas-content.ts`

Plain TypeScript data modules. No tests — static data.

- [ ] **Step 1: Create `lib/about/empathy-content.ts`**

```ts
export type EmpathyQuadrant = {
  label: string
  body: string
}

export type EmpathySegment = {
  id: 'a' | 'b' | 'c'
  personaName: string
  age: number
  archetype: string
  blurb: string
  colorVar: string
  character: string
  quadrants: {
    piensa: EmpathyQuadrant
    ve: EmpathyQuadrant
    oye: EmpathyQuadrant
    dice: EmpathyQuadrant
    duele: EmpathyQuadrant
    aspira: EmpathyQuadrant
  }
}

export const EMPATHY_SEGMENTS: EmpathySegment[] = [
  {
    id: 'a',
    personaName: 'Laura',
    age: 24,
    archetype: 'Joven digital sin mascota',
    blurb: 'Soltera, trabaja en marketing digital. Ama los animales pero nunca ha tenido mascota propia.',
    colorVar: 'var(--color-pop-700)',
    character: '/assets/about/empathy/segment-a-character.svg',
    quadrants: {
      piensa: {
        label: '¿Qué piensa y siente?',
        body: 'Quiere adoptar pero no sabe cómo. Siente culpa al ver animales abandonados. Ve la adopción como acto ético.',
      },
      ve: {
        label: '¿Qué ve?',
        body: 'Publicaciones de rescate en Instagram. Poca información clara sobre adopción en RD. Pet shops vendiendo razas.',
      },
      oye: {
        label: '¿Qué oye?',
        body: '"Adoptar es complicado, mejor compra". Historias de mascotas abandonadas en redes. "Las mascotas cuestan mucho".',
      },
      dice: {
        label: '¿Qué dice y hace?',
        body: 'Busca info en Instagram y Google sin respuestas claras. Pospone adoptar por falta de confianza. Pagaría < RD$5,000/mes.',
      },
      duele: {
        label: '¿Qué le duele?',
        body: 'No sabe dónde buscar (35%). Falta de información clara (29%). Procesos largos y complicados. Desconfianza en canales existentes.',
      },
      aspira: {
        label: '¿A qué aspira?',
        body: 'Guía paso a paso del proceso. Saber el costo mensual real. App que centralice todo. Planes integrales de cuidado (82%).',
      },
    },
  },
  {
    id: 'b',
    personaName: 'Carlos',
    age: 26,
    archetype: 'Joven dueño comprometido',
    blurb: 'Soltero, adoptó un perro callejero hace un año. Lo considera su hijo. Trabaja tiempo completo.',
    colorVar: 'var(--color-slate-500)',
    character: '/assets/about/empathy/segment-b-character.svg',
    quadrants: {
      piensa: {
        label: '¿Qué piensa y siente?',
        body: '"Mi mascota es mi hijo/familia". Abrumado por costos veterinarios inesperados. Orgulloso de haber adoptado.',
      },
      ve: {
        label: '¿Qué ve?',
        body: 'Veterinarios con precios variables. Tips de otros dueños en redes. Servicios de grooming desorganizados.',
      },
      oye: {
        label: '¿Qué oye?',
        body: 'Recomendaciones de veterinarios de amigos. "No te olvides de la vacuna". "Adopta, no compres".',
      },
      dice: {
        label: '¿Qué dice y hace?',
        body: 'Lleva al veterinario cuando hay problema (78%). Busca en Google ante síntomas. Pagaría RD$5K-7K/mes por plan completo.',
      },
      duele: {
        label: '¿Qué le duele?',
        body: 'Costos veterinarios altos (44%). Falta de tiempo para cuidado (44%). Olvidar vacunas y citas (33%).',
      },
      aspira: {
        label: '¿A qué aspira?',
        body: 'Todo el cuidado en una sola app. Recordatorios automáticos. Servicios a domicilio. Directorio veterinario confiable (47%).',
      },
    },
  },
  {
    id: 'c',
    personaName: 'María',
    age: 52,
    archetype: 'Adulto familiar tradicional',
    blurb: 'Casada, con hijos adultos. Ha tenido mascotas toda su vida. Considera adoptar de nuevo.',
    colorVar: 'oklch(70% 0.15 65)',
    character: '/assets/about/empathy/segment-c-character.svg',
    quadrants: {
      piensa: {
        label: '¿Qué piensa y siente?',
        body: '"Las mascotas son compañía y familia". Nostalgia por mascotas anteriores. Quiere cuidar bien sin complicarse.',
      },
      ve: {
        label: '¿Qué ve?',
        body: 'Hijos usando apps para todo. Publicaciones en Instagram/WhatsApp. Veterinarios de toda la vida.',
      },
      oye: {
        label: '¿Qué oye?',
        body: 'Recomendaciones de amigos y familiares (canal #1). "Hay animalitos en la calle que necesitan hogar". "Los veterinarios están caros".',
      },
      dice: {
        label: '¿Qué dice y hace?',
        body: 'Siempre lleva al veterinario de confianza. No sabe cómo adoptar formalmente (82%). Pagaría < RD$5,000/mes.',
      },
      duele: {
        label: '¿Qué le duele?',
        body: 'Procesos largos y confusos (35%). Dificultad para recordar vacunas. Sensibilidad alta al precio.',
      },
      aspira: {
        label: '¿A qué aspira?',
        body: 'App sencilla con recordatorios. Veterinarios confiables sin buscar mucho. Plan básico económico. Transporte puerta a puerta.',
      },
    },
  },
]
```

- [ ] **Step 2: Create `lib/about/plans-content.ts`**

```ts
export type Plan = {
  id: 'basico' | 'intermedio' | 'premium' | 'flexible'
  name: string
  priceIntro: string
  priceRegular: string
  transports: string
  support: string
  highlight: string
}

export const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Básico',
    priceIntro: 'Gratis 6 meses',
    priceRegular: 'luego RD$2,499/mes',
    transports: '1 transporte',
    support: 'Soporte email',
    highlight: 'Cero barrera de entrada',
  },
  {
    id: 'intermedio',
    name: 'Intermedio',
    priceIntro: 'RD$2,999/mes',
    priceRegular: 'regular RD$4,999',
    transports: '3 transportes',
    support: 'Chat prioritario',
    highlight: 'Perfil destacado',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceIntro: 'RD$5,999/mes',
    priceRegular: 'regular RD$8,999',
    transports: '5 transportes',
    support: 'Soporte 24/7',
    highlight: 'Perfil verificado',
  },
  {
    id: 'flexible',
    name: 'Flexible',
    priceIntro: 'Pago por uso',
    priceRegular: 'Sin comisión 3 meses',
    transports: 'Por demanda',
    support: 'Soporte email',
    highlight: 'Sin compromiso',
  },
]
```

- [ ] **Step 3: Create `lib/about/lean-canvas-content.ts`**

```ts
export type LeanCanvasBlock = {
  id: string
  title: string
  shortText: string
  fullText: string
  col: number // 1..5 grid column
  row: number // 1..2 grid row
}

export const LEAN_CANVAS: LeanCanvasBlock[] = [
  {
    id: 'socios',
    title: 'Socios Clave',
    shortText: 'Centros de rescate + transporte',
    fullText: 'Rabito Callejero, AdoptameRD, PetTransportRD y PetPickup, junto a entrenadores y paseadores, conforman un ecosistema donde ya existen soluciones parciales para el cuidado de mascotas.',
    col: 1, row: 1,
  },
  {
    id: 'actividades',
    title: 'Actividades Clave',
    shortText: 'Desarrollo y contenido visual',
    fullText: 'Desarrollo y mantenimiento de una aplicación multiplataforma que centraliza servicios, producción de contenido visual profesional, y apoyo a paseadores, entrenadores y transporte.',
    col: 2, row: 1,
  },
  {
    id: 'propuesta',
    title: 'Propuesta de Valor',
    shortText: 'Un solo lugar para todo',
    fullText: 'Simplificar la burocracia y gestión de procesos relacionados con mascotas mediante la organización y estandarización de trámites, conectando dueños con empresas que satisfacen sus necesidades.',
    col: 3, row: 1,
  },
  {
    id: 'relacion',
    title: 'Relación',
    shortText: 'Conexión estructurada',
    fullText: 'Conectar centros de rescate con adoptantes, y dueños con paseadores, entrenadores o taxistas de mascotas, dando estructura y organización a procesos informales.',
    col: 4, row: 1,
  },
  {
    id: 'segmentos',
    title: 'Segmentos',
    shortText: 'Adoptantes, centros, negocios',
    fullText: 'Adoptantes de mascotas, centros de rescate, entrenadores, paseadores y empresas de transporte que buscan conectarse de forma eficiente dentro de un ecosistema organizado.',
    col: 5, row: 1,
  },
  {
    id: 'recursos',
    title: 'Recursos Clave',
    shortText: 'Mac Mini, cámaras, jaulas',
    fullText: 'Mac Mini, vehículo, jaulas, kit de luces, cámaras y micrófonos para producción de contenido visual que alimenta el catálogo de mascotas.',
    col: 2, row: 2,
  },
  {
    id: 'canales',
    title: 'Canales',
    shortText: 'Web + app + redes',
    fullText: 'App móvil (App Store / Google Play), versión web, escritorio Electron, y redes sociales para captación y educación del mercado.',
    col: 4, row: 2,
  },
  {
    id: 'costos',
    title: 'Costos',
    shortText: 'Dev, infra, licencias',
    fullText: 'Membresía Claude Code Max, Apple Developer Program, Cloudflare R2, Google Maps Platform, servidores y servicios de email transaccional. ~USD$130/mes.',
    col: 1, row: 2,
  },
  {
    id: 'ingresos',
    title: 'Ingresos',
    shortText: 'Membresías + comisiones',
    fullText: 'Planes Básico / Intermedio / Premium / Flexible, comisiones sobre servicios de terceros (baños, paseos, transporte, vacunación), y tarifa dinámica de transporte.',
    col: 5, row: 2,
  },
]
```

- [ ] **Step 4: Commit**

```bash
git add lib/about/empathy-content.ts lib/about/plans-content.ts lib/about/lean-canvas-content.ts
git commit -m "feat(about): add content data modules"
```

---

## Task 7: `components/about/about-header.tsx` — local header driven by bridge

**Files:**
- Create: `components/about/about-header.tsx`

- [ ] **Step 1: Create the component**

`components/about/about-header.tsx`:
```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useTransform } from 'framer-motion'
import { useHeaderBridge } from './header-bridge-context'

export function AboutHeader() {
  const { progress } = useHeaderBridge()
  const opacity = useTransform(progress, [0.6, 0.95], [0, 1])
  const y = useTransform(progress, [0.6, 0.95], [-24, 0])

  return (
    <motion.header
      style={{ opacity, y }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border"
    >
      <Link href="/" className="flex items-center gap-2">
        <Image src="/assets/logo.svg" alt="Pelú" width={32} height={32} />
        <span className="font-semibold text-lg">Pelú</span>
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/pets" className="hover:text-pop-700 transition-colors">Mascotas</Link>
        <Link href="/about" className="hover:text-pop-700 transition-colors">Sobre Pelú</Link>
      </nav>
    </motion.header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/about-header.tsx
git commit -m "feat(about): add local header component driven by bridge"
```

---

## Task 8: `components/about/scroll-story.tsx` — shell with empty scenes

**Files:**
- Create: `components/about/scroll-story.tsx`
- Create: `components/about/scenes/scene-01-pitch.tsx` (stub)
- Create: `components/about/scenes/scene-02-logo-draw.tsx` (stub)
- Create: `components/about/scenes/scene-03-competition.tsx` (stub)
- Create: `components/about/scenes/scene-04-segments.tsx` (stub)
- Create: `components/about/scenes/scene-05-plans.tsx` (stub)
- Create: `components/about/scenes/scene-06-lean-canvas.tsx` (stub)
- Create: `components/about/scenes/scene-07-numbers.tsx` (stub)
- Create: `components/about/scenes/scene-08-cta.tsx` (stub)

- [ ] **Step 1: Create stub scene components**

Each stub follows this pattern. Create 8 files — one per scene — replacing `SceneXX` and the heading text:

`components/about/scenes/scene-01-pitch.tsx`:
```tsx
'use client'
export function Scene01Pitch() {
  return (
    <section data-scene="01-pitch" className="relative min-h-screen flex items-center justify-center">
      <h2 className="text-4xl">Scene 1: Pitch (stub)</h2>
    </section>
  )
}
```

Repeat for `scene-02-logo-draw.tsx` (export `Scene02LogoDraw`), `scene-03-competition.tsx` (`Scene03Competition`), `scene-04-segments.tsx` (`Scene04Segments`), `scene-05-plans.tsx` (`Scene05Plans`), `scene-06-lean-canvas.tsx` (`Scene06LeanCanvas`), `scene-07-numbers.tsx` (`Scene07Numbers`), `scene-08-cta.tsx` (`Scene08Cta`).

- [ ] **Step 2: Create the ScrollStory shell**

`components/about/scroll-story.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import { HeaderBridgeProvider } from './header-bridge-context'
import { AboutHeader } from './about-header'
import { Scene01Pitch } from './scenes/scene-01-pitch'
import { Scene02LogoDraw } from './scenes/scene-02-logo-draw'
import { Scene03Competition } from './scenes/scene-03-competition'
import { Scene04Segments } from './scenes/scene-04-segments'
import { Scene05Plans } from './scenes/scene-05-plans'
import { Scene06LeanCanvas } from './scenes/scene-06-lean-canvas'
import { Scene07Numbers } from './scenes/scene-07-numbers'
import { Scene08Cta } from './scenes/scene-08-cta'

export function ScrollStory() {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    ;(async () => {
      const { registerGsap, killAllScrollTriggers } = await import('@/lib/about/gsap-register')
      registerGsap()
      cleanup = () => killAllScrollTriggers()
    })()
    return () => { cleanup?.() }
  }, [])

  return (
    <HeaderBridgeProvider>
      <AboutHeader />
      <main className="bg-background text-foreground">
        <Scene01Pitch />
        <Scene02LogoDraw />
        <Scene03Competition />
        <Scene04Segments />
        <Scene05Plans />
        <Scene06LeanCanvas />
        <Scene07Numbers />
        <Scene08Cta />
      </main>
    </HeaderBridgeProvider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/about/scroll-story.tsx components/about/scenes
git commit -m "feat(about): add scroll story shell with 8 empty scenes"
```

---

## Task 9: Mount `ScrollStory` on `/about`

**Files:**
- Modify: `app/about/page.tsx`

- [ ] **Step 1: Replace page content**

`app/about/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { ScrollStory } from '@/components/about/scroll-story'

export const metadata: Metadata = {
  title: 'Pelú — Plataforma de adopción y cuidado de mascotas en RD',
  description:
    'Centralizamos el ecosistema de adopción y cuidado de mascotas en República Dominicana. Proyecto de tesis — PUCMM 2026.',
  openGraph: {
    title: 'Pelú',
    description: 'Centralizamos el ecosistema de adopción y cuidado de mascotas en RD.',
    images: ['/assets/logo.svg'],
  },
}

export default function AboutPage() {
  return <ScrollStory />
}
```

- [ ] **Step 2: Verify dev server renders the page**

Run `bun run dev` is assumed running. Open `http://localhost:3000/about` and confirm: 8 visible sections labeled "Scene 1: Pitch (stub)" through "Scene 8". Header is present (opacity 0 until bridge fires — which won't yet, so it'll be invisible; that's expected).

- [ ] **Step 3: Commit**

```bash
git add app/about/page.tsx
git commit -m "feat(about): mount scroll story on /about route"
```

---

## Task 10: Scene 1 — Pitch + header handoff (desktop)

**Files:**
- Modify: `components/about/scenes/scene-01-pitch.tsx`

This is the most architecturally loaded scene — it drives the `HeaderBridge` that every other scene just consumes. Once this works, the pattern repeats for scenes 2-8.

- [ ] **Step 1: Replace the stub with the real scene**

`components/about/scenes/scene-01-pitch.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useHeaderBridge } from '../header-bridge-context'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene01Pitch() {
  const sectionRef = useRef<HTMLElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const { progress } = useHeaderBridge()
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced) {
      progress.set(1) // header visible immediately in fallback
      return
    }
    if (!sectionRef.current) return

    let ctxCleanup: (() => void) | undefined
    ;(async () => {
      const { gsap, ScrollTrigger } = await import('@/lib/about/gsap-register')

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 1,
          onUpdate: (self) => progress.set(self.progress),
        },
      })

      tl.to(logoRef.current, {
        scale: 0.08,
        xPercent: -600,
        yPercent: -700,
        ease: 'power2.inOut',
      }, 0)
      tl.to('[data-scene="01-pitch"] [data-fade-out]', {
        opacity: 0,
        y: -20,
        ease: 'power1.out',
      }, 0)

      ctxCleanup = () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })()

    return () => { ctxCleanup?.() }
  }, [isDesktop, reduced, progress])

  return (
    <section
      ref={sectionRef}
      data-scene="01-pitch"
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="absolute inset-0 pointer-events-none opacity-40 [background:radial-gradient(ellipse_at_top,theme(colors.pop.700/30%),transparent_60%)]" />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center text-white">
        <div ref={logoRef} className="flex items-center gap-6">
          <Image src="/assets/logo.svg" alt="Pelú" width={128} height={128} priority />
          <span className="text-7xl md:text-9xl font-bold tracking-tight">Pelú</span>
        </div>
        <p data-fade-out className="max-w-2xl text-xl md:text-2xl text-white/80">
          Centralizamos el ecosistema de adopción y cuidado de mascotas en República Dominicana.
        </p>
        <p data-fade-out className="max-w-xl text-base md:text-lg text-white/60">
          Hoy está fragmentado. Nosotros lo organizamos.
        </p>
        <p data-fade-out className="text-sm uppercase tracking-widest text-white/50">
          Alexander Tejeda · Maria Francisco · Nataly Corporan
        </p>
        <p data-fade-out className="absolute bottom-10 text-xs uppercase tracking-widest text-white/40">
          Desliza para conocer más ↓
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Manual browser check**

Open `http://localhost:3000/about` on desktop. Verify:
- Scene 1 pins as you scroll
- Logo + "Pelú" shrinks and moves toward top-left
- Subtitle text fades out
- Around 60-95% scroll progress, local `<AboutHeader>` fades in
- Scene releases after ~1.5 viewports of scroll

If pinning misbehaves (layout jumps), add `ScrollTrigger.refresh()` after any dynamic layout changes.

- [ ] **Step 3: Commit**

```bash
git add components/about/scenes/scene-01-pitch.tsx
git commit -m "feat(about): implement scene 1 pitch with pinned header handoff"
```

---

## Task 11: `components/about/empathy-map.tsx` — reusable empathy map

**Files:**
- Create: `components/about/empathy-map.tsx`
- Test: `components/__tests__/about/empathy-map.test.tsx`

- [ ] **Step 1: Write the failing test**

`components/__tests__/about/empathy-map.test.tsx`:
```tsx
import { renderWithProviders } from '../test-utils'
import { EmpathyMap } from '@/components/about/empathy-map'
import { EMPATHY_SEGMENTS } from '@/lib/about/empathy-content'

describe('EmpathyMap', () => {
  it('renders all six quadrant labels for segment A', () => {
    const segment = EMPATHY_SEGMENTS[0]
    const { container } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(container.textContent).toContain(segment.quadrants.piensa.label)
    expect(container.textContent).toContain(segment.quadrants.ve.label)
    expect(container.textContent).toContain(segment.quadrants.oye.label)
    expect(container.textContent).toContain(segment.quadrants.dice.label)
    expect(container.textContent).toContain(segment.quadrants.duele.label)
    expect(container.textContent).toContain(segment.quadrants.aspira.label)
  })

  it('renders the character image with persona name in alt text', () => {
    const segment = EMPATHY_SEGMENTS[0]
    const { getByAltText } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(getByAltText(segment.personaName)).toBeInTheDocument()
  })

  it('renders persona archetype and age', () => {
    const segment = EMPATHY_SEGMENTS[0]
    const { container } = renderWithProviders(<EmpathyMap segment={segment} />)
    expect(container.textContent).toContain(segment.archetype)
    expect(container.textContent).toContain(String(segment.age))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/about/empathy-map.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

`components/about/empathy-map.tsx`:
```tsx
'use client'

import Image from 'next/image'
import { EmpathySegment } from '@/lib/about/empathy-content'

const QUADRANTS = ['piensa', 've', 'oye', 'dice', 'duele', 'aspira'] as const

// Angles in degrees (12 o'clock = -90deg in SVG/CSS): 12, 2, 4, 6, 8, 10
const ANGLES_DEG = [-90, -30, 30, 90, 150, 210]

type Props = { segment: EmpathySegment }

export function EmpathyMap({ segment }: Props) {
  const quadrantEntries = QUADRANTS.map((q, i) => ({
    key: q,
    angleDeg: ANGLES_DEG[i],
    data: segment.quadrants[q],
  }))

  return (
    <div
      data-empathy-map
      data-segment={segment.id}
      className="relative w-full max-w-5xl aspect-square mx-auto"
      style={{ ['--seg-color' as string]: segment.colorVar }}
    >
      {/* Persona label */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center z-10">
        <p className="text-xs uppercase tracking-widest text-foreground/60">Segmento {segment.id.toUpperCase()}</p>
        <h3 className="text-2xl md:text-3xl font-bold">
          {segment.personaName}, {segment.age}
        </h3>
        <p className="text-sm text-foreground/70">{segment.archetype}</p>
      </div>

      {/* Character at center */}
      <div
        data-empathy-character
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in oklch, var(--seg-color) 15%, transparent)' }}
      >
        <Image
          src={segment.character}
          alt={segment.personaName}
          width={224}
          height={224}
          className="w-full h-full object-contain p-6"
        />
      </div>

      {/* Radiating lines + labels */}
      <svg
        data-empathy-svg
        viewBox="-50 -50 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <circle
          data-empathy-frame
          cx="0"
          cy="0"
          r="18"
          fill="none"
          stroke="var(--seg-color)"
          strokeWidth="0.3"
          strokeDasharray="113"
          strokeDashoffset="0"
          opacity="0.5"
        />
        {quadrantEntries.map(({ key, angleDeg }) => {
          const rad = (angleDeg * Math.PI) / 180
          const x = Math.cos(rad) * 42
          const y = Math.sin(rad) * 42
          return (
            <line
              key={key}
              data-empathy-line={key}
              x1="0"
              y1="0"
              x2={x}
              y2={y}
              stroke="var(--seg-color)"
              strokeWidth="0.25"
              strokeLinecap="round"
              opacity="0.6"
            />
          )
        })}
      </svg>

      {/* Quadrant text cards — absolutely positioned by angle */}
      {quadrantEntries.map(({ key, angleDeg, data }) => {
        const rad = (angleDeg * Math.PI) / 180
        // Percentage offsets from center, outside the line endpoint
        const xPct = 50 + Math.cos(rad) * 46
        const yPct = 50 + Math.sin(rad) * 46
        return (
          <div
            key={key}
            data-empathy-label={key}
            className="absolute w-48 md:w-56 -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
          >
            <p
              className="text-xs font-bold uppercase tracking-wider mb-1"
              style={{ color: 'var(--seg-color)' }}
            >
              {data.label}
            </p>
            <p className="text-xs md:text-sm text-foreground/80 leading-snug">{data.body}</p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/about/empathy-map.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/about/empathy-map.tsx components/__tests__/about/empathy-map.test.tsx
git commit -m "feat(about): add reusable empathy map component"
```

---

## Task 12: Scene 4 — Segments with stacked empathy maps (desktop + fallback)

**Files:**
- Modify: `components/about/scenes/scene-04-segments.tsx`

- [ ] **Step 1: Replace the stub**

`components/about/scenes/scene-04-segments.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { EmpathyMap } from '../empathy-map'
import { EMPATHY_SEGMENTS } from '@/lib/about/empathy-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene04Segments() {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced || !sectionRef.current) return
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')

      const maps = sectionRef.current!.querySelectorAll('[data-empathy-map]')
      // Hide all but first
      gsap.set(maps, { autoAlpha: 0 })
      gsap.set(maps[0], { autoAlpha: 1 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=300%',
          pin: true,
          scrub: 1,
        },
      })

      const animateMap = (mapEl: Element, offset: number) => {
        const frame = mapEl.querySelector('[data-empathy-frame]')
        const lines = mapEl.querySelectorAll('[data-empathy-line]')
        const labels = mapEl.querySelectorAll('[data-empathy-label]')
        const character = mapEl.querySelector('[data-empathy-character]')

        tl.fromTo(character, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.15 }, offset)
        tl.fromTo(frame, { strokeDashoffset: 113 }, { strokeDashoffset: 0, duration: 0.1 }, offset + 0.15)
        lines.forEach((line, i) => {
          const start = offset + 0.25 + i * 0.08
          tl.fromTo(line, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.08 }, start)
          tl.fromTo(labels[i], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.08 }, start + 0.02)
        })
      }

      // Timeline segments: map 0 @ 0.00, map 1 @ 1.0, map 2 @ 2.0, each fading to next
      animateMap(maps[0], 0)
      tl.to(maps[0], { autoAlpha: 0, duration: 0.1 }, 0.95)
      tl.set(maps[1], { autoAlpha: 1 }, 1.0)
      animateMap(maps[1], 1.0)
      tl.to(maps[1], { autoAlpha: 0, duration: 0.1 }, 1.95)
      tl.set(maps[2], { autoAlpha: 1 }, 2.0)
      animateMap(maps[2], 2.0)

      cleanup = () => {
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })()

    return () => { cleanup?.() }
  }, [isDesktop, reduced])

  return (
    <section
      ref={sectionRef}
      data-scene="04-segments"
      className="relative min-h-screen overflow-hidden bg-background py-24"
    >
      <div className="px-6 max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">A quién servimos</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-16">Tres segmentos, tres historias</h2>
        <div className={isDesktop && !reduced ? 'relative h-[70vh]' : 'space-y-32'}>
          {EMPATHY_SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              className={
                isDesktop && !reduced
                  ? 'absolute inset-0 flex items-center justify-center'
                  : 'flex items-center justify-center'
              }
            >
              <EmpathyMap segment={segment} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Manual browser check**

Scroll through `/about`, reach Scene 4. Verify on desktop: scene pins, map A plays clockwise reveal, fades out, map B plays, fades out, map C plays. Scene releases cleanly.

On mobile (resize browser <768px), verify: three maps stacked vertically, all visible simultaneously, no pinning.

- [ ] **Step 3: Commit**

```bash
git add components/about/scenes/scene-04-segments.tsx
git commit -m "feat(about): implement scene 4 with stacked empathy map reveal"
```

---

## Task 13: Scene 2 — Logo draw beat

**Files:**
- Modify: `components/about/scenes/scene-02-logo-draw.tsx`

- [ ] **Step 1: Replace the stub**

`components/about/scenes/scene-02-logo-draw.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene02LogoDraw() {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced || !sectionRef.current) return
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 1,
        },
      })
      tl.fromTo(
        '[data-scene="02-logo-draw"] [data-draw-logo]',
        { scale: 0.4, opacity: 0 },
        { scale: 1, opacity: 1, ease: 'power2.out' }
      )
      tl.fromTo(
        '[data-scene="02-logo-draw"] [data-draw-word]',
        { opacity: 0, letterSpacing: '1em' },
        { opacity: 1, letterSpacing: '0em', ease: 'power2.out' },
        '<0.1'
      )
      cleanup = () => { tl.scrollTrigger?.kill(); tl.kill() }
    })()

    return () => { cleanup?.() }
  }, [isDesktop, reduced])

  return (
    <section
      ref={sectionRef}
      data-scene="02-logo-draw"
      className="relative min-h-screen flex items-center justify-center bg-background"
    >
      <div className="flex items-center gap-6">
        <div data-draw-logo>
          <Image src="/assets/logo.svg" alt="Pelú" width={96} height={96} />
        </div>
        <span data-draw-word className="text-6xl md:text-8xl font-bold">Pelú</span>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/scenes/scene-02-logo-draw.tsx
git commit -m "feat(about): implement scene 2 logo draw beat"
```

---

## Task 14: Scene 3 — Competencia

**Files:**
- Modify: `components/about/scenes/scene-03-competition.tsx`

- [ ] **Step 1: Replace the stub**

`components/about/scenes/scene-03-competition.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

const COMPETITORS = [
  {
    name: 'PetBacker',
    description:
      'Plataforma global que conecta individuos con cuidadores independientes. Formularios largos, confianza construida a base de reseñas entre desconocidos.',
    integrated: false,
  },
  {
    name: 'PetTransportRD',
    description: 'Transporte especializado de mascotas en RD. Tarifas por ruta.',
    integrated: true,
  },
  {
    name: 'PetPickup',
    description: 'Transporte urbano e interurbano. Tarifa adicional si el dueño acompaña.',
    integrated: true,
  },
]

export function Scene03Competition() {
  const sectionRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced || !sectionRef.current) return
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 1,
        },
      })
      tl.fromTo(
        '[data-scene="03-competition"] [data-card]',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, stagger: 0.15 }
      )
      tl.fromTo(
        '[data-scene="03-competition"] [data-badge]',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, stagger: 0.1 },
        0.6
      )
      tl.fromTo(
        '[data-scene="03-competition"] [data-payoff]',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0 },
        0.9
      )
      cleanup = () => { tl.scrollTrigger?.kill(); tl.kill() }
    })()

    return () => { cleanup?.() }
  }, [isDesktop, reduced])

  return (
    <section
      ref={sectionRef}
      data-scene="03-competition"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">La competencia</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Qué ya existe, y qué cambia con Pelú</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {COMPETITORS.map((c) => (
            <div
              key={c.name}
              data-card
              className="rounded-2xl border border-border p-6 bg-background/50 relative"
            >
              <h3 className="text-xl font-bold mb-3">{c.name}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{c.description}</p>
              {c.integrated && (
                <div
                  data-badge
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pop-700/15 text-pop-700 px-3 py-1.5 text-xs font-semibold"
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  Integrado en Pelú
                </div>
              )}
            </div>
          ))}
        </div>
        <div
          data-payoff
          className="max-w-3xl text-lg md:text-xl leading-relaxed border-l-4 border-pop-700 pl-6"
        >
          PetBacker conecta individuos con formularios largos. <strong>Pelú empieza con negocios verificados</strong> — cero fricción, confianza respaldada por evidencia real.
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/scenes/scene-03-competition.tsx
git commit -m "feat(about): implement scene 3 competition with differentiator payoff"
```

---

## Task 15: Scene 5 — Planes radial

**Files:**
- Modify: `components/about/scenes/scene-05-plans.tsx`

- [ ] **Step 1: Replace the stub**

`components/about/scenes/scene-05-plans.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { PLANS } from '@/lib/about/plans-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'
import { cn } from '@/lib/utils'

const RADIUS = 260

export function Scene05Plans() {
  const sectionRef = useRef<HTMLElement>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced || !sectionRef.current) return
    let cleanup: (() => void) | undefined
    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current!,
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: 1,
        },
      })
      tl.fromTo(
        '[data-scene="05-plans"] [data-plan-card]',
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, stagger: 0.12 }
      )
      cleanup = () => { tl.scrollTrigger?.kill(); tl.kill() }
    })()
    return () => { cleanup?.() }
  }, [isDesktop, reduced])

  const canRadial = isDesktop && !reduced

  return (
    <section
      ref={sectionRef}
      data-scene="05-plans"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">Los planes</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-16">Elige cómo usar Pelú</h2>

        {canRadial ? (
          <div className="relative w-full h-[600px] flex items-center justify-center">
            <div className="absolute flex items-center justify-center w-32 h-32 rounded-full bg-pop-700/15 text-pop-700 font-bold text-2xl">
              Pelú
            </div>
            {PLANS.map((plan, i) => {
              const angle = (i / PLANS.length) * Math.PI * 2 - Math.PI / 2
              const x = Math.cos(angle) * RADIUS
              const y = Math.sin(angle) * RADIUS
              return (
                <div
                  key={plan.id}
                  data-plan-card
                  onMouseEnter={() => setHoveredId(plan.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'absolute w-56 rounded-2xl border border-border bg-background p-5 shadow-sm transition-transform cursor-default',
                    hoveredId === plan.id && 'scale-110 shadow-lg border-pop-700',
                    hoveredId && hoveredId !== plan.id && 'opacity-40'
                  )}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                >
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-pop-700 font-semibold">{plan.priceIntro}</p>
                  <p className="text-xs text-foreground/60 mb-3">{plan.priceRegular}</p>
                  <p className="text-xs text-foreground/80">{plan.transports}</p>
                  <p className="text-xs text-foreground/80">{plan.support}</p>
                  <p className="text-xs text-foreground/60 italic mt-2">{plan.highlight}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-border p-5 text-left">
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-pop-700 font-semibold">{plan.priceIntro}</p>
                <p className="text-xs text-foreground/60 mb-3">{plan.priceRegular}</p>
                <p className="text-xs text-foreground/80">{plan.transports}</p>
                <p className="text-xs text-foreground/80">{plan.support}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/scenes/scene-05-plans.tsx
git commit -m "feat(about): implement scene 5 plans radial layout"
```

---

## Task 16: Scene 6 — Lean Canvas with hover-expand

**Files:**
- Modify: `components/about/scenes/scene-06-lean-canvas.tsx`

- [ ] **Step 1: Replace the stub**

`components/about/scenes/scene-06-lean-canvas.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LEAN_CANVAS } from '@/lib/about/lean-canvas-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'

export function Scene06LeanCanvas() {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const canHover = isDesktop && !reduced

  return (
    <section
      data-scene="06-lean-canvas"
      className="relative min-h-screen bg-background py-24"
    >
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">El modelo</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-12">Lean Canvas</h2>

        {canHover ? (
          <motion.div layout className="grid grid-cols-5 gap-2 h-[500px]">
            {LEAN_CANVAS.map((block) => (
              <motion.div
                layout
                key={block.id}
                onMouseEnter={() => setHoveredId(block.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="rounded-2xl border border-border bg-background p-4 overflow-hidden"
                style={{
                  gridColumn: `${block.col}`,
                  gridRow: `${block.row}`,
                  flex: hoveredId === block.id ? 3 : 1,
                }}
              >
                <h4 className="text-sm font-bold mb-2">{block.title}</h4>
                <motion.p layout className="text-xs text-foreground/80 leading-snug">
                  {hoveredId === block.id ? block.fullText : block.shortText}
                </motion.p>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {LEAN_CANVAS.map((block) => (
              <div key={block.id} className="rounded-2xl border border-border p-4">
                <h4 className="text-sm font-bold mb-2">{block.title}</h4>
                <p className="text-xs text-foreground/80">{block.fullText}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/scenes/scene-06-lean-canvas.tsx
git commit -m "feat(about): implement scene 6 lean canvas with hover expand"
```

---

## Task 17: `components/about/counter-up.tsx` + Scene 7 — Números

**Files:**
- Create: `components/about/counter-up.tsx`
- Modify: `components/about/scenes/scene-07-numbers.tsx`

- [ ] **Step 1: Create the counter component**

`components/about/counter-up.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  target: number
  prefix?: string
  suffix?: string
  durationMs?: number
  format?: (n: number) => string
}

export function CounterUp({ target, prefix = '', suffix = '', durationMs = 1200, format }: Props) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const start = performance.now()
            const step = (t: number) => {
              const p = Math.min((t - start) / durationMs, 1)
              setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
              if (p < 1) requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, durationMs])

  const display = format ? format(value) : value.toLocaleString('es-DO')
  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}
```

- [ ] **Step 2: Replace scene 7 stub**

`components/about/scenes/scene-07-numbers.tsx`:
```tsx
'use client'

import { CounterUp } from '../counter-up'

const METRICS = [
  { target: 45112, prefix: 'RD$', label: 'Inversión inicial' },
  { target: 130, prefix: '~USD$', suffix: '/mes', label: 'Gastos operativos' },
  { target: 41, label: 'Encuestados en el estudio de mercado' },
  { target: 3, label: 'Segmentos identificados' },
]

export function Scene07Numbers() {
  return (
    <section
      data-scene="07-numbers"
      className="relative min-h-screen flex items-center bg-background py-24"
    >
      <div className="max-w-6xl mx-auto px-6 w-full">
        <p className="text-xs uppercase tracking-widest text-foreground/60 mb-2">Los números</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-16">La base financiera</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {METRICS.map((m) => (
            <div key={m.label}>
              <div className="text-4xl md:text-5xl font-bold text-pop-700 mb-2">
                <CounterUp target={m.target} prefix={m.prefix} suffix={m.suffix} />
              </div>
              <p className="text-sm text-foreground/70">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/about/counter-up.tsx components/about/scenes/scene-07-numbers.tsx
git commit -m "feat(about): implement scene 7 numbers with counter-up animation"
```

---

## Task 18: Scene 8 — CTA

**Files:**
- Modify: `components/about/scenes/scene-08-cta.tsx`

- [ ] **Step 1: Replace the stub**

`components/about/scenes/scene-08-cta.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'

export function Scene08Cta() {
  return (
    <section
      data-scene="08-cta"
      className="relative min-h-screen flex items-center bg-gradient-to-b from-background to-slate-900 text-foreground"
    >
      <div className="max-w-4xl mx-auto px-6 text-center w-full">
        <h2 className="text-5xl md:text-7xl font-bold mb-6">Pelú está vivo</h2>
        <p className="text-xl md:text-2xl text-foreground/80 mb-12">
          Explora las mascotas disponibles para adopción hoy.
        </p>
        <Link
          href="/pets"
          className="inline-flex items-center gap-3 rounded-xl bg-pop-700 hover:bg-pop-650 text-white px-8 py-4 text-lg font-semibold transition-colors"
        >
          Ver mascotas
          <FontAwesomeIcon icon={faArrowRight} />
        </Link>
        <p className="mt-16 text-xs uppercase tracking-widest text-foreground/50">
          Proyecto de tesis · PUCMM · 2026
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/about/scenes/scene-08-cta.tsx
git commit -m "feat(about): implement scene 8 CTA with pets link"
```

---

## Task 19: Scenes smoke test

**Files:**
- Create: `components/__tests__/about/scenes.smoke.test.tsx`

- [ ] **Step 1: Write the smoke test**

`components/__tests__/about/scenes.smoke.test.tsx`:
```tsx
import { renderWithProviders } from '../test-utils'
import { HeaderBridgeProvider } from '@/components/about/header-bridge-context'
import { Scene01Pitch } from '@/components/about/scenes/scene-01-pitch'
import { Scene02LogoDraw } from '@/components/about/scenes/scene-02-logo-draw'
import { Scene03Competition } from '@/components/about/scenes/scene-03-competition'
import { Scene04Segments } from '@/components/about/scenes/scene-04-segments'
import { Scene05Plans } from '@/components/about/scenes/scene-05-plans'
import { Scene06LeanCanvas } from '@/components/about/scenes/scene-06-lean-canvas'
import { Scene07Numbers } from '@/components/about/scenes/scene-07-numbers'
import { Scene08Cta } from '@/components/about/scenes/scene-08-cta'

// jsdom lacks matchMedia by default
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('min-width: 768px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

const wrap = (ui: React.ReactElement) => (
  <HeaderBridgeProvider>{ui}</HeaderBridgeProvider>
)

describe('About scenes smoke', () => {
  it('scene 1 renders the pitch headline', () => {
    const { container } = renderWithProviders(wrap(<Scene01Pitch />))
    expect(container.textContent).toContain('Pelú')
    expect(container.textContent).toContain('Alexander Tejeda')
  })
  it('scene 2 renders without crashing', () => {
    const { container } = renderWithProviders(wrap(<Scene02LogoDraw />))
    expect(container.querySelector('[data-scene="02-logo-draw"]')).toBeTruthy()
  })
  it('scene 3 renders all three competitors', () => {
    const { container } = renderWithProviders(wrap(<Scene03Competition />))
    expect(container.textContent).toContain('PetBacker')
    expect(container.textContent).toContain('PetTransportRD')
    expect(container.textContent).toContain('PetPickup')
  })
  it('scene 4 renders all three personas', () => {
    const { container } = renderWithProviders(wrap(<Scene04Segments />))
    expect(container.textContent).toContain('Laura')
    expect(container.textContent).toContain('Carlos')
    expect(container.textContent).toContain('María')
  })
  it('scene 5 renders all four plans', () => {
    const { container } = renderWithProviders(wrap(<Scene05Plans />))
    expect(container.textContent).toContain('Básico')
    expect(container.textContent).toContain('Intermedio')
    expect(container.textContent).toContain('Premium')
    expect(container.textContent).toContain('Flexible')
  })
  it('scene 6 renders all lean canvas titles', () => {
    const { container } = renderWithProviders(wrap(<Scene06LeanCanvas />))
    expect(container.textContent).toContain('Propuesta de Valor')
    expect(container.textContent).toContain('Ingresos')
  })
  it('scene 7 renders metric labels', () => {
    const { container } = renderWithProviders(wrap(<Scene07Numbers />))
    expect(container.textContent).toContain('Inversión inicial')
    expect(container.textContent).toContain('Segmentos identificados')
  })
  it('scene 8 renders the CTA link', () => {
    const { getByText } = renderWithProviders(wrap(<Scene08Cta />))
    expect(getByText('Ver mascotas').closest('a')).toHaveAttribute('href', '/pets')
  })
})
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run components/__tests__/about/`
Expected: PASS — all tests green (hooks + empathy map + scenes smoke).

- [ ] **Step 3: Commit**

```bash
git add components/__tests__/about/scenes.smoke.test.tsx
git commit -m "test(about): add scenes smoke tests"
```

---

## Task 20: Reduced-motion and mobile audit

- [ ] **Step 1: Reduced motion manual test**

Open DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Reload `/about`. Verify:
- No pinning on any scene
- Scenes stack naturally
- Header is visible from page load
- No broken layouts

- [ ] **Step 2: Mobile manual test**

DevTools device mode → iPhone 14 Pro. Verify:
- All 8 scenes scroll naturally with no pinning
- Scene 4 empathy maps stack vertically
- Scene 5 plans shown as 2x2 grid (no radial)
- Scene 6 lean canvas stacks vertically
- No horizontal scroll anywhere

- [ ] **Step 3: Fix any issues found**

If any scene breaks in fallback mode, return to its file and guard animation code with `if (!isDesktop || reduced) return`. If layout breaks, check Tailwind responsive modifiers on the outer section.

- [ ] **Step 4: Commit (if any fixes applied)**

```bash
git add -u
git commit -m "fix(about): reduced-motion and mobile fallback fixes from audit"
```

If no fixes needed, skip this commit.

---

## Task 21: Delete old about page

**Files:**
- Delete: `components/landing/about-page.tsx`

- [ ] **Step 1: Verify old page is unreferenced**

Run: `grep -rn "landing/about-page" app components --include="*.tsx" --include="*.ts"`
Expected: only matches inside `components/landing/about-page.tsx` itself (none from callers).

If any caller still imports from it, stop and investigate before deleting.

- [ ] **Step 2: Delete**

Run:
```bash
rm components/landing/about-page.tsx
```

- [ ] **Step 3: Check for orphaned i18n keys**

Open `public/locales/es/landing.json` and `public/locales/en/landing.json`. Scan for keys that were only referenced from the old about page (e.g. `landing.about.*`). Remove any keys that are no longer referenced anywhere else in the codebase.

To find references: `grep -rn "t('about" components app --include="*.tsx"`

If no other file uses the old keys, delete them from both JSON files.

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: ALL tests pass (no dangling references to the deleted file).

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "chore(about): remove legacy landing/about-page component"
```

---

## Task 22: Final lint + type check

- [ ] **Step 1: Lint**

Run: `bun run lint`
Expected: no errors (warnings OK if pre-existing).

Fix any errors introduced by new files.

- [ ] **Step 2: Type check (if tsc available)**

Run: `bunx tsc --noEmit`
Expected: no errors.

Fix any type errors introduced by new files.

- [ ] **Step 3: Commit (if any fixes applied)**

```bash
git add -u
git commit -m "fix(about): lint and type fixes"
```

---

## Done

At this point:
- `/about` renders an 8-scene pinned-scroll narrative on desktop
- Mobile and reduced-motion users get a clean stacked fallback
- Unit tests cover hooks, context, empathy map, and scene smoke tests
- The branch `about-scrollytelling` is ready for PR review against `main`

Next steps (outside this plan):
- Design a proper OG image for the page
- Real-device testing on iPhone Safari and Android Chrome
- Consider adding scroll-depth analytics once in production

---

## Self-Review Notes

- Spec coverage — every scene from the spec has a dedicated task (Tasks 10, 12, 13-18). Header bridge is Task 5+7+10. Empathy map is Task 11. Mobile fallback is baked into every scene's implementation guarded by `useIsDesktop() && !useReducedMotion()`. Reduced-motion audit is Task 20.
- Placeholder scan — no "TBD", "TODO" code, "implement later", or vague error-handling directions. Every step has complete code or explicit commands.
- Type consistency — `HeaderBridge.progress` is `MotionValue<number>` everywhere; `EmpathySegment` type is defined once in `lib/about/empathy-content.ts` and imported where used; `useIsDesktop` and `useReducedMotion` have stable signatures across all scenes.
- Spec deviation — the "global Header modification" from the spec is replaced with a local `AboutHeader` in Task 7. Documented at the top of the plan.
