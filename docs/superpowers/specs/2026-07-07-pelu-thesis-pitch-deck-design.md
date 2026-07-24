# Pelú Thesis Pitch Deck — Design & Content Spec (Phase 1)

- **Date:** 2026-07-07
- **Status:** Draft for teacher review
- **Owners:** Alexander Tejeda (Tech), María Francisco (Ops/Alliances), Nataly Corporán (Marketing)
- **Language convention:** This spec is written in **English**. All on-screen slide copy is in **Spanish** (the thesis and the audience are Spanish-speaking).

---

## 0. Purpose & Scope

### 0.1 What this document is
This is the **Phase 1** design-and-content spec for the ~10-minute pitch deck that accompanies the Pelú thesis (business plan). It is the single source of truth for:

1. **Brand design rules** — colors, logo, typography, layout, motion — that the deck MUST follow.
2. **Reference document** — the thesis distilled into a canonical fact sheet, so every number/claim on a slide is accurate and traceable.
3. **Deck structure & copy** — all 10 sections, with the Spanish text for each slide.
4. **Hyperframes layer** — how the live/animated product demo and slide motion are authored.

This document will be **presented to the teacher** for approval before the deck is built.

### 0.2 Locked decisions
| Decision | Choice | Rationale |
|---|---|---|
| Medium | **Web/HTML deck built in the Pelú repo, authored with hyperframes** | Full control over logo/colors (the Canva auto-gen ignored the brand kit); native live/animated embeds of the real app. |
| Theme | **Dark — deep slate + teal accent** | Dramatic, premium, matches the slate logo; teal pops key numbers. |
| Length | ~10 slides / ~10 min (~1 min/slide) | Fits the time limit; forces one idea per slide. |
| Spec language / copy language | English spec / Spanish copy | Per team decision. |

### 0.3 Out of scope (deferred to the Phase 2 spec)
- Concrete implementation steps, file structure, and component code for the deck.
- The **editing pass** ("another spec to edit the presentation") after the teacher's feedback.
- Final render/export settings and delivery packaging.

This Phase 1 spec defines **what** the deck is and the rules it obeys; Phase 2 defines **how** it is built and edited.

---

## 1. Brand Design Rules

All values are derived from the Pelú app itself: `app/globals.css` (color tokens, fonts) and `public/assets/logo.svg` / `public/favicon.svg` (logo). Colors below are the `oklch` tokens converted to sRGB hex. **Reuse the app's real CSS variables when building the deck — do not hand-copy approximations.**

### 1.1 Color tokens

**Slate scale (primary neutral — note: darker than default Tailwind):**
| Token | Hex | Typical deck use |
|---|---|---|
| `slate-50` | `#F7F8FC` | Primary text on dark; light-theme surfaces |
| `slate-100` | `#ECEEF4` | Secondary light text |
| `slate-200` | `#C9CED8` | Muted text on dark |
| `slate-300` | `#979FAF` | Captions, footnotes on dark |
| `slate-400` | `#596378` | Disabled / hairline on dark |
| `slate-500` | `#303A51` | Borders, dividers |
| `slate-600` | `#182136` | Elevated surfaces / cards |
| `slate-700` | `#081124` | Panels |
| `slate-800` | `#020618` | **Primary deck background (canvas)** |
| `slate-900` | `#00010C` | Deepest background / vignette |

**"Pop" accent (teal/cyan — use sparingly, for emphasis only):**
| Token | Hex | Use |
|---|---|---|
| `pop-500` | `#53EAFD` | Key numbers, highlights, active state, CTA |
| `pop-600` | `#24CAE0` | Accent lines, secondary highlight, hover |
| `pop-700` | `#1B98A8` | Accent on light surfaces |
| `pop-800` | `#147380` | Deep accent / gradients |
| `pop-900` | `#0E4E57` | Accent-tinted panels |

**Semantic (dark theme, from `.dark` in globals.css):**
- Background: `#040405`–`#020618` · Foreground: `#F7F8FA` · Muted foreground: `#8B8F99` · Border/secondary: `#14161A`.
- Destructive (red, use almost never in a pitch): `#460809`.

**Usage rules**
- **Background:** deep slate (`slate-800` `#020618`) as the canvas; layer `slate-700`/`slate-600` for cards/panels. Optional subtle radial vignette toward `slate-900`.
- **Text:** `slate-50` for primary, `slate-300` for secondary/captions. Never pure white (`#FFFFFF`) or pure black.
- **Accent:** teal is a **spotlight, not a fill** — one accent moment per slide (the key stat, one keyword, or a divider). Overusing it kills the emphasis.
- **Contrast:** maintain WCAG AA (≥4.5:1 body, ≥3:1 large text). `slate-50` on `slate-800` and `pop-500` on `slate-800` both pass.

### 1.2 Logo

- **Source:** `public/assets/logo.svg` — a paw mark, `viewBox="0 0 332.83 352.62"`. `public/favicon.svg` is the same mark.
- **Native fills** are dark greys (`#3B424C`, `#404753`, `#464E5A`) → these are for **light** backgrounds only.
- **Rule for the dark deck:** recolor the paw to **`slate-50` (`#F7F8FC`)** for standard placement, or **`pop-500` (`#53EAFD`)** for a single hero/branded moment. Provide a light SVG variant rather than CSS-filtering the dark one.
- **Clear space:** keep padding ≥ the paw's toe-bean radius on all sides. **Min size:** ≥ 40 px tall on screen.
- **Don'ts:** don't stretch/skew, don't add drop shadows/gradients to the mark, don't place on a busy photo without a scrim, don't rotate.
- **Placement:** small mark in a consistent corner on content slides; large centered mark only on the cover and closing slides.

### 1.3 Typography

- **Family:** `Inter` (fallbacks `Source Sans 3`, `Manrope`, `system-ui`) — exactly as `--font-sans` in globals.css.
- **Type scale (16:9, 1920×1080 reference):**
  | Role | Size | Weight | Tracking | Use |
  |---|---|---|---|---|
  | Display / hero | 88–120 px | 700 | −2% | Cover title, big stat |
  | H1 (slide title) | 48–64 px | 600 | −1% | One per slide, top-left |
  | H2 / lead | 32–40 px | 600 | 0 | Section lead-in |
  | Body / bullet | 24–28 px | 400–500 | 0 | Max ~4 bullets/slide |
  | Caption / source | 16–18 px | 400 | 0 | Citations, footnotes (`slate-300`) |
- **Rules:** left-aligned by default; line-height 1.15 for headings, 1.4 for body; never more than 2 type sizes competing on one slide; numbers in tabular figures where comparing.

### 1.4 Layout & spacing
- **Aspect:** 16:9. **Safe margins:** ≥ 6% of width on all edges; nothing critical outside it (projector overscan).
- **One idea per slide.** Title top-left, supporting content below/right, accent moment anchored.
- **Whitespace is a feature** — resist filling the slide. Bullets are short phrases, not sentences (full sentences live in speaker notes).
- **Consistent anchors:** slide title baseline, logo corner, and footer (slide number + "Pelú · Tesis") in the same position every slide.

### 1.5 Motion (hyperframes seekable animations)
- **Purposeful only:** motion directs attention (reveal a stat, build a diagram) — never decorative bounce.
- **Consistency:** one easing (`ease-out`, ~cubic-bezier(0.16,1,0.3,1)) and 2 durations (fast 200 ms, standard 400 ms).
- **Reveal order:** title → context → the accent moment last. Fragment reveals for bullet lists.
- **Transitions:** a single slide transition style throughout (e.g., soft cross-fade + 12 px rise). No mixed zoo of transitions.

### 1.6 Iconography & imagery
- **Icons:** thin line style, `slate-300`/`pop-500`, consistent stroke width. (App uses a line-icon set; match it.)
- **Photography:** real pets/adoption/transport imagery, desaturated slightly and tinted toward slate so it sits in the dark theme; always with a `slate-900` scrim behind any overlaid text.
- **Don't:** stock-clipart, mismatched illustration styles, or photos that fight the accent color.

---

## 2. Reference Document (canonical facts)

This is the **single source of truth** for deck copy. Every figure traces to `proyectoFinal-claude.md` (the thesis) or its cited source. If a slide and this table disagree, this table wins. (The full **Resumen Ejecutivo** and **Conclusiones y recomendaciones** I drafted are the narrative companions to this fact sheet.)

### 2.1 Company snapshot
- **Name / form:** Pelú, **S.R.L.**, based in the **Distrito Nacional**, RD. Digital intermediary, **no physical location** (e-commerce, Ley 126-02).
- **Model:** hybrid **P2P** (individuals offer pet services without forming a company) + **B2B** (digital tools for transporters, vets, rescue centers).
- **Team:** Alexander Tejeda — *Tecnología y Desarrollo* (Full-Stack); María Francisco — *Operaciones y Alianzas*; Nataly Corporán — *Marketing, Comunicación y Atención al Cliente*. Collaborators/allies: Alberto Encarnación (photography), Michael Ovalles (PetTransportRD), Isabel Valenzuela (AdoptameRD).

### 2.2 Mission / Vision / Values
- **Misión:** intermediary that helps address the stray-animal problem, promoting adoption and responsible care and reducing rescue centers' administrative burden.
- **Visión:** become the reference **digital ecosystem for pets**.
- **Valores:** transparencia, responsabilidad, empatía, respeto. (Not profit-driven; revenue sustains the platform.)

### 2.3 Value proposition (5 pillars)
Institutional trust · structured processes · operational transparency (real-time tracking + automated quoting) · social orientation (responsible adoption) · multiplatform accessibility. Differentiator vs. open peer marketplaces / manual case-by-case handling: **validated actors**.

### 2.4 Market data (with sources)
- **Global pet-care market:** ≈ **USD 289.17 B (2026) → USD 499.06 B (2034)**, CAGR ≈ **7.06%** (Fortune Business Insights, 2026).
- **Local (RD):** pet-food market growing ≈ **12%/yr**, reaching ≈ USD 29 M by 2029 (Pet Food Latinoamérica, 2025).
- **PetTech:** > USD 12 B in 2024 (Global Market Insights, 2024).
- **Own survey (n = 43):** 49% own ≥1 pet; **40%** see the pet as family (33%) or "a child" (7%) → humanization.
- **Own pricing survey (n = 42):** **95% would not pay > RD$7,000/mo** (56% < RD$5,000; 39% RD$5,000–7,000) → high price sensitivity → penetration pricing.

### 2.5 Business model
- **Subscription plans:** Básico (1 transporte / correo), Intermedio (3 / chat prioritario / perfil destacado), Premium (5 / soporte dedicado 24-7 / perfil verificado), Flexible (pago por uso). Plus **commissions** on intermediated services.
- **Costs:** operating ≈ **RD$113,543.40/yr**, mostly fixed (Claude Max 71,339.64; Google Maps 14,267.93; depreciation 19,375.08; Apple Developer 5,944.97; Cloudflare R2 1,426.79; domain 1,188.99).
- **Funding:** **self-funded** by the three founders' contributions; future external funding (strategic investors / entrepreneurship programs) evaluated after consolidation.
- **Unit economics:** fixed costs + user-scaling revenue → profitability rises directly past break-even.

### 2.6 Positioning & marketing
Focused differentiation (trust + local roots + service integration) · **vet as entry point** via local search/SEO · **anchor partners** (AdoptameRD, PetTransportRD) solve cold-start · content-and-cause marketing (each adoption = organic content) · **window of opportunity** before foreign entrants (Rover, Miwuki, PetBacker).

### 2.7 Growth strategy
- **Short:** finish Pelú; fully automate the adoption + transport flow for first allies.
- **Medium:** extend beyond web → **mobile apps (App Store, Google Play)** and desktop; more B2B features (vets, trainers).
- **Long:** widen services/providers; expand to **Latin America**. Deterministic automation as the default; AI only where it adds clear differential value.

### 2.8 Prototype / traction
Functional prototype at **pelurd.com** with differentiated roles (**Miembro, Empresa, Centro de Rescate**), integrated chat, **real-time transport map**, and **automated quoting** (by km/time/weight/pet count). **Tested by real allies** AdoptameRD and PetTransportRD, whose feedback shaped features (e.g., quoting).

### 2.9 Conclusions (thesis close)
- **Hallazgos:** an excellent learning opportunity — a P2P/B2B e-commerce built from scratch from an initial adoption motive; hypothesis validated with real partners.
- **Factores críticos de éxito:** (1) ≥ **2,000 users with active memberships**; (2) higher adoption frequency; (3) allied businesses reach a broader audience.
- **Retos y próximos pasos:** core challenge = **building trust with pet owners**; plus support, ToS for production edge cases, staffing (community/social/events); next steps = App Store / Google Play / desktop, and expand B2B services from recurring custom-request patterns.

---

## 3. Deck Structure & Copy (Spanish)

10 slides. For each: **purpose** (EN), **on-screen copy** (ES), **speaker note** (ES, 1 line), **motion/hyperframes** (EN), **time**. Copy is intentionally terse — full argument lives in the speaker's mouth, not on the slide.

> Global chrome (every content slide): small `slate-50` paw top-left · footer "Pelú · Tesis" + slide number bottom-right · deep-slate canvas.

### Slide 1 — Portada · `Pelú`
- **Purpose:** brand-forward open; set the premium tone.
- **Copy (ES):** `Pelú` — *El ecosistema digital para las mascotas* · "Plan de negocios · Presentación de tesis" · "Alexander Tejeda · María Francisco · Nataly Corporán".
- **Speaker note:** "Somos Pelú: conectamos todo el mundo de las mascotas en un solo lugar."
- **Motion:** large centered paw (`slate-50`) fades in; teal underline draws under "Pelú"; subtitle rises.
- **Time:** 0:15

### Slide 2 — El problema
- **Purpose:** make the pain real and dual (social + market).
- **Copy (ES):** título "El problema". Bullets: "Sobrepoblación de animales callejeros en RD" · "Rescates saturados por gestión manual" · "Servicios dispersos: WhatsApp, redes, contacto directo" · "Nadie centraliza adopción, transporte y cuidado".
- **Speaker note:** "El ecosistema existe, pero está roto y fragmentado."
- **Motion:** bullets reveal as fragments; the last line highlights in teal.
- **Time:** 1:00

### Slide 3 — La solución: Pelú
- **Purpose:** the one-liner + the dual model.
- **Copy (ES):** "Un ecosistema digital que centraliza los servicios para mascotas." Two panels — **P2P:** "Personas ofrecen servicios sin constituir empresa." **B2B:** "Herramientas digitales para transportistas, veterinarias y rescates." Footer line: "Intermediario de confianza: estructura + transparencia."
- **Speaker note:** "Un solo lugar, dos motores: personas y negocios."
- **Motion:** two panels slide in from opposite sides and meet at a central paw.
- **Time:** 1:00

### Slide 4 — El producto en acción  ⟵ **hyperframes demo slide**
- **Purpose:** the differentiator — a real, working product.
- **Copy (ES):** título "El producto en acción" · pill "En vivo: pelurd.com". Micro-captions overlaid on the demo: "Roles: Miembro · Empresa · Centro de Rescate" · "Cotización automática (km · tiempo · peso · mascotas)" · "Seguimiento del transporte en tiempo real".
- **Speaker note:** "Esto no es una maqueta: está desplegado y funcionando."
- **Motion/hyperframes:** the app walkthrough plays here (see §4). Captions appear synced to the demo steps.
- **Time:** 1:30–2:00 (give this the most time)

### Slide 5 — Validación real
- **Purpose:** proof by real partners.
- **Copy (ES):** título "Validación real". "Probado por **AdoptameRD** (rescate) y **PetTransportRD** (transporte)." · "Su retroalimentación definió funciones clave, como la cotización." · "Socios ancla que resuelven el arranque en frío."
- **Speaker note:** "El mercado ya lo probó y nos ayudó a construirlo."
- **Motion:** two partner logos fade in with a short quote/attribution.
- **Time:** 1:00

### Slide 6 — Mercado y oportunidad
- **Purpose:** big, growing, underserved.
- **Copy (ES):** título "Mercado y oportunidad". Big teal stat: "**US$289 mM → US$499 mM** (2026–2034)". Support: "Local: alimentos para mascotas +12 % anual" · "Encuesta (n=43): 49 % tiene mascota, 40 % la ve como familia" · "RD: mercado fragmentado y poco digitalizado". Source caption: "Fortune Business Insights, 2026".
- **Speaker note:** "Mercado enorme, creciendo, y sin integrar en RD."
- **Motion:** the big number counts up; a rising line/area chart animates.
- **Time:** 1:00

### Slide 7 — Modelo de negocio
- **Purpose:** how it makes money, and why it scales.
- **Copy (ES):** título "Modelo de negocio". "Planes: Básico · Intermedio · Premium · Flexible" · "Comisión sobre servicios intermediados" · "Precios de penetración: 95 % no paga > RD$7,000/mes" · "Costos fijos → cada usuario nuevo mejora la rentabilidad".
- **Speaker note:** "Ingresos escalan; los costos casi no."
- **Motion:** a compact 4-plan strip; the "fixed cost / scaling revenue" idea shown as two diverging lines.
- **Time:** 1:00

### Slide 8 — Ventaja competitiva
- **Purpose:** why we win, and why now.
- **Copy (ES):** título "Ventaja competitiva". "Diferenciación enfocada: confianza + arraigo local + integración" · "Socios ancla = masa crítica desde el día uno" · "La veterinaria como puerta de entrada (SEO local)" · "Ventana antes de que entren plataformas extranjeras".
- **Speaker note:** "Construimos confianza local antes que nadie más lo intente."
- **Motion:** four points reveal; "ventana" line highlights in teal.
- **Time:** 0:45

### Slide 9 — Finanzas y equipo
- **Purpose:** lean, credible, self-funded, with a capable team.
- **Copy (ES):** título "Finanzas y equipo". "Gastos operativos ≈ RD$113,543/año, mayormente fijos" · "Autofinanciado por los 3 socios fundadores" · "Rentabilidad directa tras el punto de equilibrio". Team row: "Tecnología y Desarrollo · Operaciones y Alianzas · Marketing y Atención".
- **Speaker note:** "Estructura ligera, autofinanciada, con roles claros."
- **Motion:** three founder chips fade in with names/roles.
- **Time:** 1:00

### Slide 10 — Visión y próximos pasos
- **Purpose:** the arc forward + social purpose (memorable close).
- **Copy (ES):** título "Visión y próximos pasos". Timeline: "Corto: completar Pelú y automatizar adopción + transporte" · "Mediano: apps móviles (App Store, Google Play) y escritorio" · "Largo: ampliar servicios B2B y expandir a Latinoamérica". Closing line (teal): "Más adopciones. Menos animales sin hogar."
- **Speaker note:** "De prototipo validado a producto consolidado — con propósito."
- **Motion:** horizontal timeline draws left→right; closing line and centered paw resolve.
- **Time:** 0:45

---

## 4. Hyperframes Layer

### 4.1 What / why
[hyperframes](https://github.com/heygen-com/hyperframes) — "Write HTML. Render video. Built for agents." — turns HTML/CSS/JS with **seekable animations** into either a **deterministic MP4** or a **navigable interactive deck** (fragments, hotspot navigation, presenter mode). We use it because:
- The deck is authored as **code in the Pelú repo**, so it reuses the app's real CSS tokens and the logo SVG → the brand is correct by construction (fixing the Canva problem).
- The demo slide can show the **actual product**, not screenshots.
- It is **agent-drivable** via its skills (what we are installing), so the build/edit loop is fast and reproducible.

### 4.2 Authoring model
- Each slide = an HTML section styled with the shared brand CSS (import the app's token variables; do not re-declare colors).
- Animations are **seekable** (timeline-driven), so reveals are deterministic and re-render identically — key for a reliable defense.
- Output modes: **(a)** interactive deck for live presenting (presenter mode + fragment reveals); **(b)** MP4 render as a safe fallback if the room's setup is uncertain. We target **both**: present live, carry the MP4.

### 4.3 The "producto en acción" demo (Slide 4)
Two options; the spec **recommends the recorded/scripted walkthrough** with a live fallback:
- **Option A — Scripted seekable walkthrough (recommended):** a pre-captured, animated run through the real UI (roles → quoting → real-time map) composed as hyperframes HTML with synced captions. Deterministic, no live-network risk, re-renderable to MP4.
- **Option B — Live embed:** an iframe of `pelurd.com` routes/states embedded in the slide. Highest "wow," but depends on network + login state + the room. If used, keep Option A's MP4 as the fallback on the same slide.

Decision to confirm at build time (Phase 2); default to A unless a rehearsal proves the live embed is reliable.

### 4.4 Motion plan by slide
Encapsulated in §3 per slide. Global rules from §1.5 apply (one easing, two durations, accent-last reveal, single transition style).

### 4.5 Technical integration notes
- **Location:** the deck lives in the Pelú repo (e.g., a `presentation/` or `docs/deck/` area — finalized in Phase 2), so it can import brand tokens and, for Option B, reach app routes.
- **Assets:** light paw SVG variant (recolored `slate-50` / `pop-500`), partner logos (AdoptameRD, PetTransportRD), any demo captures.
- **Fonts:** Inter, self-hosted as the app already does.

---

## 5. Open Questions / Assumptions

1. **Hyperframes API specifics** — confirmed conceptually via docs; verify the exact slide/animation authoring API **after install**, and adjust §4 if needed. *(Assumption: HTML/CSS/JS slides + seekable animations + MP4/interactive output, per the project README.)*
2. **Slide 4 demo mode** — A (scripted, recommended) vs B (live embed). Decide after a rehearsal.
3. **Logo dark variant** — produce a `slate-50` (and a `pop-500`) recolored SVG; confirm the mark reads well at small sizes on `slate-800`.
4. **Teacher-mandated format** — confirm there are no required sections/order/branding the rubric imposes that would override §3.
5. **Repo location for the deck** — `presentation/` vs `docs/deck/` (Phase 2).
6. **Spec home** — this file lives in the **Pelú repo** (`docs/superpowers/specs/`) because the deck is built here; move/copy to the thesis repo if the teacher wants it alongside `proyectoFinal-claude.*`.

---

## 6. Deliverables & Next Steps

- **Phase 1 (this spec):** brand rules + reference facts + deck structure/copy + hyperframes plan → **review with teacher**.
- **Phase 2 (next spec):** implementation plan for building the deck in the repo, then the **editing pass** after the teacher's feedback (this is the "another spec to edit the presentation" already anticipated).
- **Prereq in flight:** hyperframes + its agent skills being installed in this directory.
