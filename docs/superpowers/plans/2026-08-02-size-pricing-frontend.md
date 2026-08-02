# Size-Based Transport Pricing — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a business configure size-based pricing, let owners optionally record a pet's weight in pounds, and thread size and weight into every quote call so the picker and the confirmation agree.

**Architecture:** Extends the existing pet-taxi section of the business settings tab rather than inventing a pattern — same string-held inputs, same `FEE_MAX` validator, same send-only-non-empty payload builder. `PetOption` widens to carry size and weight so the transport form can pass them to both the quote and the fan-out.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind v4, react-i18next, Vitest + RTL, Bun.

**Spec:** `../../../../docs/superpowers/specs/2026-08-02-pet-weight-transport-quotes-design.md` (§6)

**Blocked by:** the API plan (`api/docs/superpowers/plans/2026-08-02-size-pricing-api.md`) must land through Task 12. `docs/api/swagger.yaml` is the contract — do not start until `priced_from` and `taxi_size_pricing_enabled` appear in it.

---

## Environment rules — read before Task 1

- **There is no `test` npm script.** Run `npx vitest run <path>`.
- **`npx tsc --noEmit` is CLEAN on `main` as of 2026-08-02** (commit `901cfdf` fixed the last two errors). Any error you see is yours. This is a change from earlier plans, which told you to expect exactly 2 baseline errors — that guidance is now obsolete.
- **🚨 `components/__tests__/test-utils.tsx` contains its own `vi.mock('next/navigation', …)`.** Because imports hoist, a `vi.mock('next/navigation')` written in *your* test file registers FIRST and LOSES. Use `vi.spyOn(nav, 'useSearchParams')` instead. Plan snippets that do otherwise have shipped tests that could never pass.
- **`design-system.test.ts` fails on `main`** with 7 known inline-`style={{}}` violations in `logo-loader.tsx`, `transition-overlay.tsx` and `mfa-enrollment.tsx`. Expect it. Do not fix it, and do not add new inline styles.
- **Do NOT run `bun run build`.** It writes `.next` (despite `distDir: 'out'`) and 500s the running dev server. Assume `bun run dev` is up.
- **Font Awesome only** — never lucide-react or inline SVG. Size with `text-*`, not `w-*`/`h-*`.
- **Cards `rounded-2xl`, buttons/inputs `rounded-xl`.** No other radii.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/api/businesses.ts` | Modify: four new pricing fields on the business type and update input |
| `lib/api/transport.ts` | Modify: `quoteTrip`/`requestTrip` carry size + weight; `TripQuote` gains `priced_from` |
| `lib/types/pet.ts`, `lib/types/user-pet.ts` | Modify: `weight_lb` |
| `components/dashboard/business/settings-tab.tsx` | Modify: toggle + three band inputs |
| `components/pets/member-add-pet-modal.tsx` | Modify: optional weight input |
| `components/dashboard/rescue-center/add-pet-modal.tsx` | Modify: optional weight input |
| `components/transport/transport-creation-form.tsx` | Modify: widen `PetOption`, pass size/weight |
| `components/transport/transport-business-picker.tsx` | Modify: pass size/weight to the fan-out; estimate badge |
| `public/locales/{es,en}/{business,pets,transport}.json` | Modify: new strings |

---

### Task 1: Types

**Files:**
- Modify: `lib/api/businesses.ts:74-80`, `:127-129`
- Modify: `lib/api/transport.ts`
- Modify: `lib/types/pet.ts`, `lib/types/user-pet.ts`

- [ ] **Step 1: Add the business pricing fields**

In `lib/api/businesses.ts`, beside the existing `taxi_base_fee` / `taxi_per_km` / `taxi_per_minute` on the business type:

```ts
  /**
   * Size-band pricing. The toggle is always present; the three surcharges are
   * `omitempty` on the wire, so an absent field means "use the platform default",
   * NOT "free". Mirrors how taxi_base_fee already behaves.
   */
  taxi_size_pricing_enabled?: boolean
  taxi_surcharge_small?: number | null
  taxi_surcharge_medium?: number | null
  taxi_surcharge_large?: number | null
```

And the same four on `UpdateBusinessInput` (around `:127`), typed `number` / `boolean` without null.

- [ ] **Step 2: Add `priced_from` and the quote inputs**

In `lib/api/transport.ts`:

```ts
/**
 * What selected the pricing band. "size" is NOT a degraded case — it is how most
 * operators price. Only "none" warrants an estimate badge in the UI.
 */
export type PricedFrom = 'weight' | 'size' | 'none' | 'disabled'
```

Add `priced_from: PricedFrom` to `TripQuote` and to the per-row quote on `MarketplaceBusiness`.

- [ ] **Step 3: Add `weight_lb` to both pet types**

```ts
  weight_lb?: number | null
```

There is no `weight_kg` anywhere in this repo to migrate — this is purely additive.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: clean (exit 0).

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/businesses.ts lib/api/transport.ts lib/types/
git -C /home/noob_master/pelu/frontend commit -m "types: add size pricing fields, priced_from and pet weight"
```

---

### Task 2: Business settings — toggle and three amounts

**Files:**
- Modify: `components/dashboard/business/settings-tab.tsx`
- Test: `components/__tests__/dashboard/business-settings-pricing.test.tsx`

> This file **already exists** with passing tests and a `petTaxiToggle()` helper at line 70. Extend it. Do not create it.

- [ ] **Step 1: Write the failing test**

```tsx
const sizeToggle = () => screen.getByRole('checkbox', { name: /Cobrar seg[úu]n el tama[ñn]o/ })

it('reveals the three band inputs only when size pricing is on', async () => {
  renderSettings()
  await screen.findByLabelText(/Tarifa base/)
  expect(screen.queryByLabelText(/Recargo.*mediano/i)).not.toBeInTheDocument()
  fireEvent.click(sizeToggle())
  expect(screen.getByLabelText(/Recargo.*mediano/i)).toBeInTheDocument()
})

it('sends only the bands that carry a value', async () => {
  renderSettings()
  fireEvent.click(sizeToggle())
  fireEvent.change(screen.getByLabelText(/Recargo.*mediano/i), { target: { value: '300' } })
  fireEvent.click(screen.getByRole('button', { name: /Guardar/ }))
  await waitFor(() => {
    const body = JSON.parse(mockUpdate.mock.calls.at(-1)![0] as unknown as string)
    expect(body.taxi_size_pricing_enabled).toBe(true)
    expect(body.taxi_surcharge_medium).toBe(300)
    expect(body).not.toHaveProperty('taxi_surcharge_small')
  })
})
```

Match the existing file's render helper and mock names rather than the placeholders above — grep the file first.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/dashboard/business-settings-pricing.test.tsx`
Expected: FAIL — no such checkbox.

- [ ] **Step 3: Implement the state**

Beside the existing fee state (around `:87-89`):

```tsx
  // Size-band pricing. Strings for the same reason as the fees above: an empty
  // input must stay distinguishable from an explicit 0, because the backend
  // reads NULL as "use the platform default" and 0 as "free".
  const [sizePricingEnabled, setSizePricingEnabled] = useState(false)
  const [surchargeSmall, setSurchargeSmall] = useState<string>('')
  const [surchargeMedium, setSurchargeMedium] = useState<string>('')
  const [surchargeLarge, setSurchargeLarge] = useState<string>('')
```

Prefill in the same `useEffect` that fills the fees (around `:127-129`):

```tsx
        setSizePricingEnabled(data.taxi_size_pricing_enabled ?? false)
        setSurchargeSmall(data.taxi_surcharge_small != null ? String(data.taxi_surcharge_small) : '')
        setSurchargeMedium(data.taxi_surcharge_medium != null ? String(data.taxi_surcharge_medium) : '')
        setSurchargeLarge(data.taxi_surcharge_large != null ? String(data.taxi_surcharge_large) : '')
```

Validation, mirroring `baseFeeInvalid` and gated on both toggles:

```tsx
  const surchargeInvalid =
    petTaxiEnabled && sizePricingEnabled &&
    (feeOutOfRange(surchargeSmall) || feeOutOfRange(surchargeMedium) || feeOutOfRange(surchargeLarge))
```

Add `surchargeInvalid` to `saveBlocked`.

Payload, inside the existing `if (petTaxiEnabled) {` block:

```tsx
      pricingPayload.taxi_size_pricing_enabled = sizePricingEnabled
      if (sizePricingEnabled) {
        if (surchargeSmall.trim() !== '') pricingPayload.taxi_surcharge_small = Number(surchargeSmall)
        if (surchargeMedium.trim() !== '') pricingPayload.taxi_surcharge_medium = Number(surchargeMedium)
        if (surchargeLarge.trim() !== '') pricingPayload.taxi_surcharge_large = Number(surchargeLarge)
      }
```

- [ ] **Step 4: Implement the markup**

Inside the existing `{petTaxiEnabled && (` block, after the per-minute input:

```tsx
            {/* Size-band pricing opt-in */}
            <div className="flex items-start gap-3 pt-2 border-t">
              <input
                type="checkbox"
                id="size-pricing-optin"
                checked={sizePricingEnabled}
                onChange={() => setSizePricingEnabled((v) => !v)}
                className="mt-0.5 shrink-0"
              />
              <label htmlFor="size-pricing-optin" className="cursor-pointer">
                <span className="text-sm font-medium block">{tb('settings.size_pricing_label')}</span>
                <span className="text-xs text-muted-foreground">{tb('settings.size_pricing_hint')}</span>
              </label>
            </div>

            {sizePricingEnabled && (
              <div className="space-y-4">
                {([
                  ['small', surchargeSmall, setSurchargeSmall, '0'],
                  ['medium', surchargeMedium, setSurchargeMedium, '250'],
                  ['large', surchargeLarge, setSurchargeLarge, '600'],
                ] as const).map(([band, value, setter, placeholder]) => (
                  <div key={band}>
                    <label htmlFor={`surcharge-${band}`} className="text-xs text-muted-foreground mb-1 block">
                      {tb(`settings.size_surcharge_${band}_label`)}
                    </label>
                    <input
                      id={`surcharge-${band}`}
                      type="number"
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={placeholder}
                      min={0}
                      max={FEE_MAX}
                      aria-invalid={feeOutOfRange(value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{tb('settings.size_pricing_default_hint')}</p>
              </div>
            )}
```

The placeholders show the platform default so a blank field reads as "use the default" rather than "free" — that distinction is the whole reason these are strings.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/__tests__/dashboard/business-settings-pricing.test.tsx`
Expected: PASS, including the file's 9 pre-existing tests.

- [ ] **Step 6: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/dashboard/business/settings-tab.tsx components/__tests__/dashboard/business-settings-pricing.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(business): let a business charge by pet size"
```

---

### Task 3: Optional weight input on the member pet modal

**Files:**
- Modify: `components/pets/member-add-pet-modal.tsx` (size select at `:412-417`, state at `:66`)
- Test: `components/__tests__/pets/member-add-pet-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('submits an optional weight in pounds', async () => {
  renderModal()
  fireEvent.change(screen.getByLabelText(/Peso/), { target: { value: '40' } })
  fireEvent.click(screen.getByRole('button', { name: /Publicar/ }))
  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ weight_lb: 40 }))
  })
})

it('omits weight entirely when left blank', async () => {
  renderModal()
  fireEvent.click(screen.getByRole('button', { name: /Publicar/ }))
  await waitFor(() => {
    expect(mockCreate.mock.calls.at(-1)![0]).not.toHaveProperty('weight_lb')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/pets/member-add-pet-modal.test.tsx`
Expected: FAIL — no such label.

- [ ] **Step 3: Implement**

State beside `size` (`:66`):

```tsx
  const [weightLb, setWeightLb] = useState<string>('')
```

Reset it in the same reset function that sets `setSize('medium')` (`:138`), and prefill from `pet.weight_lb` where `pet.size` is prefilled (`:97`).

Markup beside the size select:

```tsx
            {/* Weight — optional. Most owners don't know it, which is why the
                size band above is what actually prices a transport. */}
            <div>
              <label htmlFor="pet-weight" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('details.weight_lb')}
              </label>
              <input
                id="pet-weight"
                type="number"
                min={0}
                max={500}
                value={weightLb}
                onChange={(e) => setWeightLb(e.target.value)}
                placeholder={t('details.weight_placeholder')}
                className={INPUT_CLASS}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('details.weight_hint')}</p>
            </div>
```

In both submit branches, include it only when filled:

```tsx
      ...(weightLb.trim() !== '' ? { weight_lb: Number(weightLb) } : {}),
```

Use whatever `INPUT_CLASS` equivalent this file already uses — grep before assuming.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/__tests__/pets/member-add-pet-modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/pets/member-add-pet-modal.tsx components/__tests__/pets/member-add-pet-modal.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(pets): let a member record an optional weight in pounds"
```

---

### Task 4: Same input on the rescue-centre pet modal

**Files:**
- Modify: `components/dashboard/rescue-center/add-pet-modal.tsx`
- Test: `components/__tests__/dashboard/` (match the existing add-pet test file; grep first)

- [ ] **Step 1: Write the failing test**

Mirror Task 3's two tests against the RC modal's create function and its submit button label.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/dashboard/`
Expected: FAIL.

- [ ] **Step 3: Implement**

Repeat Task 3's state, reset, prefill, markup and payload changes in this modal, placed beside its own size control. The RC modal has its own class conventions — follow the field next to it, not Task 3's literal classes.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/__tests__/dashboard/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/dashboard/rescue-center/add-pet-modal.tsx components/__tests__/dashboard/
git -C /home/noob_master/pelu/frontend commit -m "feat(pets): let a rescue centre record a pet's weight in pounds"
```

---

### Task 5: Widen `PetOption` and thread size + weight through the quote

**Files:**
- Modify: `components/transport/transport-creation-form.tsx:30`, `:44-66`, `:98-116`
- Modify: `lib/api/transport.ts:170` (`quoteTrip`)
- Test: `components/__tests__/transport/` (grep for the existing creation-form test)

> **`PetOption` is currently `{ id, name }`** and both load branches map the pet down to those two fields (`:47-50`), discarding size and weight. This is the task that stops that.

- [ ] **Step 1: Write the failing test**

```tsx
it('sends the selected pet size and weight with the quote', async () => {
  // member with one user-pet: size 'large', weight_lb 80
  renderForm()
  // …fill addresses, trigger the picker…
  await waitFor(() => {
    expect(mockQuoteTrip).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'large', weight_lb: 80 }),
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/`
Expected: FAIL — the call carries only `business_id`, `from`, `to`.

- [ ] **Step 3: Widen the type and both load branches**

```tsx
type PetOption = {
  id: string
  name: string
  size?: string | null
  weight_lb?: number | null
}
```

```tsx
      if (user?.role === 'member') {
        const { data } = await listUserPets()
        if (data) setPets(data.map(p => ({ id: p.id, name: p.name, size: p.size, weight_lb: p.weight_lb })))
      } else if (user?.role === 'rescue_center') {
        // …
            setPets(rcPets.map(p => ({ id: p.id, name: p.name, size: p.size, weight_lb: p.weight_lb })))
      }
```

- [ ] **Step 4: Extend `quoteTrip` and pass the values**

```ts
export async function quoteTrip(input: {
  business_id: string
  from: Point
  to: Point
  weight_lb?: number | null
  size?: string | null
}): Promise<{ data: TripQuote | null; error: string | null }> {
```

In `handleBusinessSelected` (`:98`), and in the `requestTrip` payload (`:116`):

```tsx
    const selectedPet = pets.find(p => p.id === selectedPetId)
    // …
      size: selectedPet?.size ?? undefined,
      weight_lb: selectedPet?.weight_lb ?? undefined,
```

Note `handleBusinessSelected` currently computes nothing about the pet — hoist the `selectedPet` lookup so both it and `handleSubmit` use the same value.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/__tests__/transport/ lib/api/__tests__/transport.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/transport/transport-creation-form.tsx lib/api/transport.ts components/__tests__/transport/
git -C /home/noob_master/pelu/frontend commit -m "feat(transport): quote with the selected pet's size and weight"
```

---

### Task 6: The picker fan-out gets the same inputs

**Files:**
- Modify: `components/transport/transport-business-picker.tsx`
- Modify: `lib/api/transport.ts` (`listTransportBusinesses`, `:181`)
- Test: `components/__tests__/transport/`

> **Skipping this is the defect this feature is most likely to ship.** The picker would price every business as bandless while the confirmation prices it with the surcharge, and the number would jump between screens.

- [ ] **Step 1: Write the failing test**

```tsx
it('passes size and weight to the marketplace fan-out', async () => {
  renderPicker({ size: 'large', weightLb: 80 })
  await waitFor(() => {
    expect(mockListBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({ size: 'large', weight_lb: 80 }),
    )
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `weight_lb?: number | null` and `size?: string | null` to `listTransportBusinesses`'s params and append them to the query string when present. Add matching props to the picker and pass them from `transport-creation-form.tsx` where the picker is rendered.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/__tests__/transport/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/transport/ lib/api/transport.ts components/__tests__/transport/
git -C /home/noob_master/pelu/frontend commit -m "feat(transport): price the business picker with the pet's size"
```

---

### Task 7: The estimate badge — and only when it is warranted

**Files:**
- Modify: `components/transport/transport-creation-form.tsx:140`
- Test: `components/__tests__/transport/`

- [ ] **Step 1: Write the failing tests**

```tsx
it('badges the price as an estimate when nothing priced the band', async () => {
  // quote returns priced_from: 'none'
  expect(await screen.findByText(/Estimado/)).toBeInTheDocument()
})

it('does NOT badge a price that came from the size band', async () => {
  // quote returns priced_from: 'size' — this is normal, intentional pricing,
  // not a degraded estimate. Badging it would mislabel how most operators price.
  await screen.findByRole('button', { name: /Solicitar/ })
  expect(screen.queryByText(/Estimado/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/`
Expected: FAIL — no badge exists at all.

- [ ] **Step 3: Implement**

Near the price rendering:

```tsx
        {finalQuote?.priced_from === 'none' && (
          <p className="text-xs text-muted-foreground mt-1">{tt('form.price_estimate_note')}</p>
        )}
```

Only `'none'`. `'size'` and `'weight'` are precise; `'disabled'` means the business does not charge by size at all.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/__tests__/transport/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/transport/transport-creation-form.tsx components/__tests__/transport/
git -C /home/noob_master/pelu/frontend commit -m "feat(transport): flag a quote as an estimate only when nothing priced it"
```

---

### Task 8: Translations

**Files:**
- Modify: `public/locales/es/business.json`, `public/locales/en/business.json`
- Modify: `public/locales/es/pets.json`, `public/locales/en/pets.json`
- Modify: `public/locales/es/transport.json`, `public/locales/en/transport.json`

- [ ] **Step 1: Add the Spanish strings first**

`business.json` → `settings`:

```json
"size_pricing_label": "Cobrar según el tamaño de la mascota",
"size_pricing_hint": "Algunos transportistas cobran un recargo fijo por mascotas medianas o grandes. Si no lo activas, no se cobra nada extra por tamaño.",
"size_surcharge_small_label": "Recargo — pequeño (hasta 25 lb), DOP",
"size_surcharge_medium_label": "Recargo — mediano (26–60 lb), DOP",
"size_surcharge_large_label": "Recargo — grande (más de 60 lb), DOP",
"size_pricing_default_hint": "Si dejas un campo vacío se usa el valor por defecto de la plataforma, no cero."
```

`pets.json` → `details`:

```json
"weight_lb": "Peso (lb)",
"weight_placeholder": "Opcional",
"weight_hint": "Si no lo sabes, déjalo vacío — usamos el tamaño."
```

`transport.json` → `form`:

```json
"price_estimate_note": "Estimado — sujeto a ajuste"
```

- [ ] **Step 2: Add the English equivalents**

Same keys in each `en/` file.

- [ ] **Step 3: Verify parity**

```bash
for ns in business pets transport; do
  echo -n "$ns: "
  echo "$(python3 -c "import json;print(len(json.load(open('public/locales/es/$ns.json'))))") es / $(python3 -c "import json;print(len(json.load(open('public/locales/en/$ns.json'))))") en"
done
```

Expected: matching counts. All six namespaces were exact before this plan and must stay so.

- [ ] **Step 4: Commit**

```bash
git -C /home/noob_master/pelu/frontend add public/locales/
git -C /home/noob_master/pelu/frontend commit -m "i18n: add size pricing and pet weight strings"
```

---

### Task 9: Verification

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: everything passes **except** `design-system.test.ts` with exactly the 7 known inline-style violations in files this plan never touched. If any other test fails, it is yours.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: **clean, exit 0.** Not "2 baseline errors" — that baseline was removed on 2026-08-02.

- [ ] **Step 3: Locale parity across all six namespaces**

Expected: exact match on `common`, `auth`, `landing`, `pets`, `transport`, `business`.

- [ ] **Step 4: Do NOT run `bun run build`**

It stomps `.next` and 500s the running dev server. Leave it to a session that can restart dev afterwards.

---

## Done criteria

- [ ] A business can turn size pricing on, set one band, save, reload, and see it
- [ ] A blank band field sends nothing (platform default), not 0
- [ ] Weight is optional everywhere and blank never sends the key
- [ ] The picker and the confirmation show the **same** price for the same pet
- [ ] The estimate note appears for `priced_from: 'none'` and for nothing else
- [ ] `npx tsc --noEmit` clean; locale parity exact

## Report back

Include actual test output, and answer: **what in this plan turned out to be wrong?** Expect line numbers to have drifted and helper/mock names to differ from the placeholders here.
