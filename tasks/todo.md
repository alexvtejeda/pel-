# UI Improvement Pass — Audit + Spec (2026-07-28)

Goal: use ui-ux-pro-max design intelligence to propose improvements for the
in-scope pelurd.com routes, then write a spec to `docs/superpowers/specs/`
for Opus 5 to execute. **No implementation in this session.**

In-scope routes (from memory `pelurd-ui-audit-scope`):
`/`, `/pets`, `/aliados`, `/adopt?id=<uuid>`, `/chat`, `/mis-mascotas`,
`/servicios`, `/auth/mfa/enrollment`. Deferred: dashboards, `/about`.

## Todo

- [x] Generate design system recommendation via ui-ux-pro-max search.py
- [x] Supplementary domain searches (product, landing, ux)
- [x] Map current code/UI of all 8 in-scope routes (Explore agents — all 3
      reports in)
- [x] Drive live site: captured desktop screenshots of /pets, /aliados,
      /servicios, /mis-mascotas, /chat, /auth/mfa/enrollment, /adopt?id=…;
      mobile (375px) of / and /pets. Saved in .playwright-mcp/audit-*.jpeg
- [x] Fold in known bugs from memory (banner crop on /adopt, locale-driven
      mixed language, "72 Months" age formatting)
- [x] Write spec: docs/superpowers/specs/2026-07-28-ui-improvement-pass-design.md
- [x] Review section below

## Notes so far

- ui-ux-pro-max palette/font suggestions would be a rebrand — rejected.
  Keep existing OKLCH brand tokens + Inter/Source Sans 3/Manrope.
- Take instead: warm community landing pattern (social proof before CTA,
  3-5 testimonials with photo+name+role), Accessible & Ethical style
  (focus rings, WCAG contrast, reduced motion), empty/loading/hover/active
  state discipline, skeletons >300ms, submit feedback on all forms.

## Round 2 (same day): decisions + additions

- [x] Alex decided all 5 spec questions (Q1a, Q2a, Q3c, Q4 yes, Q5 keep) —
      folded into the frontend spec (§2 now records decisions)
- [x] Added §3.2.1 `PeluLoadingLogo` — assembling-paw loading animation
      ported from `pelu/decks/tesis/index.html:361-377` + `:96-109`
- [x] Added locale default + ES/EN switcher work to §3.7 (Q1)
- [x] Landing §4 / aliados §6 updated for Q2/Q3
- [x] Backend audit for Contactar (Explore agent over pelu/api)
- [x] Wrote cross-repo spec:
      `pelu/docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md`
      (at pelu/ root — spans both repos; includes §6 delegation table)

## Round 3 (2026-07-28): implementation plans written

Spec → plans via the `writing-plans` skill. Split into **3 plan documents by
milestone** (Alex's choice) so each ships working software on its own and each
fits in a fresh execution session:

- [x] `docs/superpowers/plans/2026-07-28-ui-pass-a-foundations.md` — §3.1–3.10.
      18 tasks: primitives, PeluLoadingLogo, ErrorState, tokens, focus recipe,
      locale default + ES/EN switcher, i18n cleanup, age formatter.
- [x] `docs/superpowers/plans/2026-07-28-ui-pass-b-p0-bugs.md` — §7/8/9/11 P0.
      10 tasks: adopt banner + load + submit outcomes, chat/mis-mascotas
      error≠empty, MFA spinner trap + silent email failure + unguarded route.
- [x] `docs/superpowers/plans/2026-07-28-ui-pass-c-route-polish.md` — §4/5/6/10
      plus the P1/P2 remainder of §7/8/9/11. 8 milestones, 29 tasks.

**No code changed.** Plans only.

### Findings that corrected the spec while grounding the plans

1. **§3.5 contrast — the spec guessed `pop-700`/`pop-750`; measured answer is
   `pop-800`.** WCAG vs white: pop-750 = 4.36:1 (fails), **pop-800 = 5.54:1
   (passes)**, pop-550 = 2.27:1. Plan A adds a `--color-pop-solid` alias.
2. **§7 "no `.catch` → infinite spinner" is not the real failure.**
   `lib/api/pets-public.ts` never rejects — it returns
   `{data: null, error: 'Error de conexión'}`. So a network outage is
   indistinguishable from a 404 and `/adopt` **silently redirects to /pets**.
   Plan B branches on `error` before deciding to redirect.
3. **§6 "translate badges through `aliados.filters.*`" — those keys don't match
   the data.** Filters are `walking`/`sitting`; providers actually store
   `dog_walking`/`pet_sitting`, and `pet_boarding` has no filter at all. Plan C
   rebuilds the list from `SERVICE_TYPES` and labels from
   `service_providers.services.*` (exact match).
4. **Blast-radius scoping.** `bg-pop-550` appears in 33 files and raw
   amber/green/yellow in 26 — mostly dashboards, which are out of scope. Both
   migrations are scoped to the audited files, with **scoped** guard tests
   rather than global bans that would fail on untouched code.
5. `components/__tests__/design-structure.test.tsx:111` asserts the active pets
   filter pill has `.bg-pop-550` — it breaks when §3.5 lands. Plan A updates it.

## Review

**No code was changed in this session** — the deliverable is the spec at
`docs/superpowers/specs/2026-07-28-ui-improvement-pass-design.md`, ready for
Opus 5 to turn into an execution plan.

Evidence gathered:
- Live prod captures (desktop 1440 + mobile 375) of all in-scope routes →
  `.playwright-mcp/audit-*.jpeg`
- Line-level code audits of all 8 routes (3 parallel Explore agents)
- ui-ux-pro-max design-system + domain searches (rebrand suggestions
  rejected; state/a11y/motion discipline adopted)

Headline findings (full detail in the spec):
- P0 bugs: /adopt banner crop root cause (indefinite parent height →
  `h-full` = auto), /adopt load with no `.catch` (infinite spinner),
  success+error shown together after partial submit, MFA TOTP setup failure
  traps user on a spinner, email OTP fails silently, MFA route unguarded,
  chat/mis-mascotas render API failures as *empty* states, "72 Months" age.
- Systemic: zero `focus-visible`/`aria-pressed` anywhere, 3 spinner idioms,
  card radius violations incl. shared ui primitives, non-token colors
  (amber/green/rgba), hardcoded es-DO locale + ~30 hardcoded strings,
  white-on-pop-550 contrast failures, mobile bottom nav covers footer.
- 5 open product questions for Alex flagged in spec §2 (locale detection,
  placeholder logos, aliados Contactar, primitive radius blast-radius, MFA
  forced dark).

---

## Plan A execution (2026-07-28) — `feat/ui-pass-foundations`

All 18 tasks of `docs/superpowers/plans/2026-07-28-ui-pass-a-foundations.md`
are implemented. 26 commits, 73 files, +1182/-249. Executed subagent-driven:
one implementer per task, then a spec-compliance review, then a code-quality
review. Every spec review passed; every quality review returned APPROVED
except one, which is recorded below.

### What shipped

- **Primitives** — `formatAge()`, `Spinner`, `PeluLoadingLogo` (the
  assembling paw, ported from the thesis deck), `ErrorState`,
  `LanguageSwitcher`. Button/Card/AlertDialog radii pinned to house values
  with guard tests.
- **Theme** — `focus-ring` utility, `success`/`warning` token families with
  dark-mode values, `--color-pop-solid` (pop-800, 5.54:1 on white).
- **Accessibility** — focus rings across every audited route (there were
  zero before), `aria-pressed` on 12 toggles, accessible names on every
  icon-only button, `prefers-reduced-motion` honored on the landing page.
- **i18n** — Spanish by default (the `navigator.language` sniff is gone),
  ES/EN switcher in header + footer, ~30 hardcoded strings translated, and
  `lib/api/mfa.ts`'s 14 Spanish error literals turned into keys.
- **Layout** — footer clears the 56px mobile bottom nav.

### Corrections made during execution

1. **Task 18's token was wrong.** `var(--color-border)` was specified as the
   chat divider's shadow, but in dark mode `--border` (L20%) is *lighter*
   than `--background` (L11%), so it rendered as a light rim, not a shadow.
   No surface token in this palette is darker than the dark background.
   Added a purpose-built `--shadow-divider` (black 6% light / 50% dark).
2. **A latent MFA regression.** The new key `mfa.errors.code_invalid_expired`
   contains the substring `expired`, which `mfa-verify.tsx` uses to trigger a
   forced re-login. Unguarded, every wrong code on the fallback path would
   have logged the user out. Gated behind `isMfaErrorKey()`.
3. **Task 16 scope extended by 3 files.** Three dashboard settings tabs
   render `deleteTotp`/`deleteWebauthn`/`deleteEmail` errors directly. Left
   alone they would have displayed the literal text `mfa.errors.delete_totp`.
4. **The language switcher failed WCAG 2.5.3.** `aria-label="Español"`
   replaced the visible "ES" as the accessible name, so voice control could
   not target it. The visible text is now the name; the full language name
   is the description.

### Known, unfixed, out of scope

- `components/__tests__/design-system.test.ts` test 10 fails on inline
  `style={{}}` in `components/transitions/transition-overlay.tsx`. This
  predates the branch (it fails on `main`) and that file is out of scope.
- **`bun run lint` is broken repo-wide.** `next lint` was removed in Next 16
  and there is no `eslint.config.*`. Nothing in this plan can run lint;
  `npx tsc --noEmit` was used as the type gate instead. Worth its own task.
- `roles.adopter` is a dead key (`UserRole` has no `adopter`); `time.just_now`
  and the new `time.now` are near-synonyms that now coexist.
- Deferred to Plans B/C as the plan intended: wiring `ErrorState` into each
  route, and the `emailEnable()` toast in `mfa-enrollment.tsx`.

### Verification

- `npx vitest run` → **390/391**, the one failure being the pre-existing
  `transition-overlay` violation above. 30 new tests added, including a
  regression test for correction 2 that was proven to fail when the
  `isMfaErrorKey` guard is removed.
- `bun run build` → succeeds, all 25 routes prerendered.
- Compiled CSS confirmed to carry `focus-ring`, `--color-pop-solid`,
  `--shadow-divider` (light + dark), the status tokens, and the
  reduced-motion guards. Static export renders `<html lang="es">`.
- **The browser sweep was NOT done** — no browser tooling was available in
  this session. Still to eyeball at 1440px and 375px, in both themes: the
  `PeluLoadingLogo` assembly, the darker `pop-solid` CTAs, keyboard focus
  rings, the chat divider shadow, and the footer above the mobile nav.

---

## Plan B execution (2026-07-29) — `fix/ui-pass-p0-bugs`

Tasks 1–3 (`/adopt`) had landed in an earlier session. This session executed
**Tasks 4–10**, subagent-driven: one implementer per task, then an independent
spec-compliance review, then a code-quality review, with fix loops.

**11 commits**, `8290d1a` → `44aae51`. Suite went **398/399 → 434/435** (+36
tests); the one failure is the same pre-existing `transition-overlay.tsx`
inline-style violation that fails on `main`.

### What shipped

- **`/chat`** — the conversation list and message thread both discarded the
  fetch error, so an outage rendered as "you have no conversations" / an empty
  thread. Both now branch `loading → error → empty` with `ErrorState` + retry.
  The no-selection panel stopped reusing `chat.empty`.
- **`/mis-mascotas`** — same class of bug; a failed fetch invited you to add
  your first pet. Now an error state with retry, and the add-pet button stays
  reachable through the failure.
- **MFA** — the TOTP setup spinner trap, the silent email-OTP failure, and the
  unguarded enrollment route are all fixed.

### Four defects found *in the plan itself* while executing it

1. **Task 8's `useCallback(..., [resolveError])` is an infinite refetch loop.**
   `useMfaError()` returns an unmemoized closure, so `startSetup`'s identity
   changes every render and the effect re-fires forever. Reproduced: `act()`
   times out at 5000ms with the plan's literal code. Fixed with a latest-ref;
   a language-switch probe (ES→EN→retry) confirms no stale closure.
2. **`totpSetup()` rejects — the plan's `startSetup` had no `.catch`.**
   `lib/api/client.ts` awaits raw `fetch` unguarded and `lib/api/mfa.ts` does
   `await res.json()` unguarded, so an unreachable API throws. Without the
   added `.catch`, the exact trap the task exists to remove survives.
3. **Task 10's literal 3-line layout breaks the forced-MFA path.**
   `ProtectedRoute` renders its *own* `<MfaEnrollment>` whose `onComplete`
   **logs the user out**, short-circuiting `children`. Wrapping the route
   naively would have logged RC/business users out on successful enrollment
   and made the route's `?mfa=1` contract dead code. Fixed with an opt-in
   `allowMfaSetupPending` prop (default `false`; all 8 existing call sites
   verified unchanged; auth and role gating both still precede the MFA branch).
4. **Task 5's replacement dropped a race guard.** The plan removed the
   `cancelled` flag, but `loadMessages` depends on `conversation.id`, so a slow
   response for conversation A could paint into B. Replaced with a request
   token — then extended to the pagination path, which the token initially
   missed and which could prepend A's history into B's thread.

### Corrections made during review

- The conversation-list retry test would have **passed against a retry that
  never refetched** (it resolved with `[]`, which the empty state already
  renders). Hardened to resolve with real data; deliberate-break check confirms
  it now fails against a no-op retry.
- Locking the MFA skip button required hoisting `handleSuccess` out of the
  `try` — which, without an added `return` in the `catch`, would have made a
  **network failure complete enrollment**. Pinned with an assertion.

### Known, unfixed, out of scope — follow-ups worth their own tasks

- **`lib/api/mfa.ts` violates the never-throw API convention.** Every function
  can reject; 15 of 18 other `lib/api/` modules use try/catch. `pets.ts` is the
  documented exception — `mfa.ts` is an undocumented second one, and every MFA
  screen inherits the trap. The local `.catch`es are a stopgap.
- **`apiClient` sets no timeout / `AbortSignal`.** A *hung* request still spins
  forever; the `.catch` branches only cover rejection.
- **`use-mfa-error.ts` is unmemoized** — the footgun behind defect 1, still
  live for the next caller who puts it in a dep array.
- `chat-conversation-list`'s new empty-state copy is member-framed but the
  component is shared with the RC dashboard chat tab.
- The chat pagination fetch still discards its error and sets `hasMore = false`,
  permanently disabling scroll-up after one transient failure.
- `login()` never sets `mfaSetupRequired`; `MfaRecoveryModal` renders without
  the forced `dark` wrapper; the MFA role list omits admins whose underlying
  role is `member`.
- `mfa-passkey-setup.tsx:55` still has the literal `←` + misused
  `mfa.settings.cancel` — folded into Plan C Milestone 7.

### Verification

- `npx vitest run` → **434/435**, the one failure pre-existing.
- `npx tsc --noEmit` → only the 2 known pre-existing `transition-link.test.tsx`
  errors.
- **`bun run build` was deliberately NOT run** — it rewrites `.next/`/`out/`,
  which the Docker prod build on port 3000 serves. Static-export risk on the
  new layout was judged nil against `app/transporte`, a shipped structural
  twin (client page with `useSearchParams` in `<Suspense>` under a
  `ProtectedRoute` layout).
- **No browser verification.** Every live step in the plan was waived and
  replaced with automated coverage. Still to eyeball: all eight failure paths
  in the plan's Final-verification table.
