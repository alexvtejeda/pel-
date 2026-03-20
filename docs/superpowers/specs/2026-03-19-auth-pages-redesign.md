# Auth Pages Redesign — Login & Register

## Goal

Replace the plain centered-card login and register pages with immersive, branded split-layout pages that match the visual polish of the onboarding wizards. Each page gets a distinct accent color: **amber for login**, **pop/teal for register**.

## Architecture

Both pages share the same layout structure — only the accent color, copy, and form fields differ. This means a single shared layout component wrapping page-specific content.

### Desktop Layout (md+)

```
┌──────────────────────────────────────────┐
│  Hero (flex: 1.1)  │  Form (flex: 0.9)   │
│                    │                      │
│  BackgroundBeams   │  Glassy card:        │
│  Paw silhouettes   │   - Title + subtitle │
│  Logo + tagline    │   - Email input      │
│  Stats (optional)  │   - Password input   │
│                    │   - CTA button       │
│                    │   - Toggle link       │
│                    │   - Divider           │
│                    │   - Google OAuth      │
│                    │   - Error display     │
└──────────────────────────────────────────┘
```

### Mobile Layout (< md)

Hero is hidden. Dark background with very subtle beams. Glassy card centered with logo + tagline inside the card header.

```
┌─────────────────────┐
│   (subtle beams)    │
│  ┌───────────────┐  │
│  │  Logo + sub   │  │
│  │  Email        │  │
│  │  Password     │  │
│  │  CTA button   │  │
│  │  Toggle link  │  │
│  │  Divider      │  │
│  │  Google       │  │
│  └───────────────┘  │
└─────────────────────┘
```

## Color System

### Login — Amber

| Element | Value |
|---|---|
| CTA button bg | `amber-500` (#f59e0b) |
| CTA button text | dark (`#0a0a0f`) |
| Beam lines stroke | `amber-500` |
| Hero gradient | `linear-gradient(145deg, #0a0a0f 0%, #1a150d 40%, #14100a 70%, #0a0a0f 100%)` |
| Accent links | `amber-500` |
| Paw silhouettes fill | `amber-500` at varying opacities (0.04–0.12) |
| Tagline | "Bienvenido de vuelta" |

### Register — Pop/Teal

| Element | Value |
|---|---|
| CTA button bg | `pop-550` |
| CTA button text | dark (`#0a0a0f`) |
| Beam lines stroke | `pop-550` |
| Hero gradient | `linear-gradient(145deg, #0a0a0f 0%, #0d1a28 40%, #0a1420 70%, #0a0a0f 100%)` |
| Accent links | `pop-550` |
| Paw silhouettes fill | `pop-550` at varying opacities (0.04–0.12) |
| Tagline | "Encuentra a tu companero ideal" |

## Components

### New: `AuthLayout`

A shared layout component that wraps both login and register pages.

**Props:**
- `accent: 'amber' | 'pop'` — determines color theme
- `heroTagline: string` — text below logo on hero side
- `children: React.ReactNode` — the form card content

**Responsibilities:**
- Renders the full-screen dark background
- Desktop: flex row with hero left + form right
- Mobile: centered form card only, subtle beams behind
- Hero side: `BackgroundBeams` (reuse existing component), paw print SVG silhouettes at scattered positions/rotations/opacities, Pelú logo, tagline, optional stats row
- Form side: glassy card container with `backdrop-blur`, `inset-shadow`, `rounded-2xl`, `border border-input`

### New: `PawSilhouettes`

Small component that renders 3-4 SVG paw prints at predetermined positions with varying size, rotation, and opacity. Accepts `className` for color overrides (amber vs pop fill).

### Modified: `LoginPage`

- Wraps form content in `<AuthLayout accent="amber" heroTagline="Bienvenido de vuelta">`
- Form card interior: title "Inicia sesión", subtitle "Ingresa tus credenciales", same fields/logic as current
- CTA button uses `bg-amber-500 text-background`
- "Regístrate" link uses `text-pop-550` (points to the pop-colored register page)
- MFA challenge flow unchanged — `MfaVerify` renders as overlay (current behavior)

### Modified: `RegisterPage`

- Wraps form content in `<AuthLayout accent="pop" heroTagline="Encuentra a tu compañero ideal">`
- Form card interior: title "Crea tu cuenta", subtitle "Únete a la comunidad", same fields/logic as current
- CTA button uses `bg-pop-550 text-background`
- "Inicia sesión" link uses `text-amber-500` (points to the amber-colored login page)
- MFA enrollment flow unchanged — still replaces the entire page when triggered

## Glassy Card Styling

Matches the onboarding wizard card pattern:

```
bg-background/30
backdrop-blur-xl
inset-shadow-[-1px_1px_1px_1px_var(--color-input)]
rounded-2xl
border border-input
```

## Hero Side Details

- **BackgroundBeams**: reuse existing `<BackgroundBeams />` component from `components/ui/beams.tsx`. It already handles the animated beam lines. The amber variant will need the beam SVG paths' stroke color changed — this can be done via a `className` prop that applies a CSS filter or by passing a color prop if the component supports it. If not, we can use a CSS `hue-rotate` filter on the beams container for the amber variant.
- **Paw silhouettes**: 3 SVG paw prints scattered at fixed positions (bottom-left, top-right, center-right) with different sizes (50px, 70px, 90px), rotations (0°, 15°, -20°), and opacities (0.04, 0.05, 0.08–0.12). Fill color matches the page accent.
- **Logo**: "Pelú" text, `text-3xl font-bold`, white
- **Stats row** (optional — can add later): "500+ Mascotas adoptadas · 50+ Centros de rescate" — small white text with muted sub-labels. This is static placeholder content for now.

## What Does NOT Change

- Form field logic, validation, error handling
- MFA challenge/enrollment flows
- Google OAuth redirect
- Auth context integration (`useAuth()`)
- Route structure (`/auth/login`, `/auth/register`)
- Any backend API calls

## Files to Create/Modify

| Action | File |
|---|---|
| Create | `components/auth/auth-layout.tsx` |
| Create | `components/auth/paw-silhouettes.tsx` |
| Modify | `components/auth/login-page.tsx` |
| Modify | `components/auth/register-page.tsx` |

## Mobile Behavior

- Hero side: `hidden md:flex`
- Form side: full width on mobile, constrained `max-w-md` centered
- On mobile, logo + tagline move inside the glassy card (above the form title)
- Subtle `BackgroundBeams` behind the card at very low opacity (0.06) for atmosphere
