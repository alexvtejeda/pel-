# Transport Quote Documents (Phase 1) — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member generate a cotización for one chosen business and open it.

**Architecture:** Deliberately thin. The document is rendered and served entirely by the API, so the frontend adds one API function, one button, and the strings around them. There is no document component in this repo and there must not be one — a React copy of the template is the two-layout drift the spec rejects.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript, Tailwind v4, react-i18next, Vitest + RTL.

**Spec:** `../../../../docs/superpowers/specs/2026-08-02-transport-quote-documents-design.md` (§9)

**Blocked by:** `api/docs/superpowers/plans/2026-08-02-quote-documents-api.md` through Task 10. `POST /quotes` must exist and appear in `docs/api/swagger.yaml`.

---

## Environment rules — read before Task 1

- **No `test` npm script.** Use `npx vitest run <path>`.
- **`npx tsc --noEmit` is CLEAN on `main`** as of 2026-08-02. Any error is yours.
- **`components/__tests__/test-utils.tsx` has its own `vi.mock('next/navigation')` that beats yours.** Use `vi.spyOn(nav, …)`.
- **`design-system.test.ts` fails on `main`** with 7 known violations. Expect it; add no new inline styles.
- **Do NOT run `bun run build`** — it stomps `.next` and 500s the dev server.
- **Font Awesome only.** Buttons `rounded-xl`, cards `rounded-2xl`.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/api/transport.ts` | Modify: `createQuote` returning `{ data, error }` |
| `components/transport/transport-business-picker.tsx` | Modify: "Solicitar cotización" per row |
| `public/locales/{es,en}/transport.json` | Modify: button, error and helper strings |

---

### Task 1: `createQuote`

**Files:**
- Modify: `lib/api/transport.ts`
- Test: `lib/api/__tests__/transport.test.ts`

> This file **already mocks `'../client'` via `vi.mocked`**. Do NOT add a second `vi.mock('@/lib/api/client', …)` factory — registering two factories for the same resolved module breaks the existing tests in this file. Follow the pattern already there.

- [ ] **Step 1: Write the failing test**

```ts
describe('createQuote', () => {
  it('returns the document url on success', async () => {
    mockApiClient.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'q1', number: 'COT-2026-0042',
        token: 'a'.repeat(32),
        url: 'http://localhost:2701/api/v1/documents/' + 'a'.repeat(32),
      }),
    } as Response)

    const result = await createQuote({
      business_id: 'b1',
      from: { lat: 18.47, lng: -69.9 },
      to: { lat: 18.5, lng: -69.95 },
      size: 'large',
      pet_name: 'Max',
      pickup_address: 'A',
      dropoff_address: 'B',
    })

    expect(result.error).toBeNull()
    expect(result.data?.number).toBe('COT-2026-0042')
  })

  it('returns an error string, never throws', async () => {
    mockApiClient.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'business does not offer pet taxi service' }),
    } as Response)

    const result = await createQuote({
      business_id: 'b1',
      from: { lat: 18.47, lng: -69.9 },
      to: { lat: 18.5, lng: -69.95 },
    })

    expect(result.data).toBeNull()
    expect(result.error).toBe('business does not offer pet taxi service')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/api/__tests__/transport.test.ts`
Expected: FAIL — `createQuote` is not exported.

- [ ] **Step 3: Implement**

```ts
export interface CreatedQuote {
  id: string
  number: string
  token: string
  /** Absolute URL of the rendered document, served by the API. */
  url: string
}

export interface CreateQuoteInput {
  business_id: string
  from: Point
  to: Point
  weight_lb?: number | null
  size?: string | null
  pet_name?: string
  pet_species?: string
  pickup_address?: string
  dropoff_address?: string
}

/**
 * Creates a persisted cotización for ONE business. The picker's per-row prices
 * stay in-memory — only a deliberate member action produces a numbered
 * document, so comparing five businesses does not issue five of them.
 */
export async function createQuote(
  input: CreateQuoteInput,
): Promise<{ data: CreatedQuote | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/quotes', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al generar la cotización' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/api/__tests__/transport.test.ts`
Expected: PASS, including the file's pre-existing tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/transport.ts lib/api/__tests__/transport.test.ts
git -C /home/noob_master/pelu/frontend commit -m "feat(transport): add createQuote for cotización documents"
```

---

### Task 2: "Solicitar cotización" in the picker

**Files:**
- Modify: `components/transport/transport-business-picker.tsx`
- Test: `components/__tests__/transport/` (grep for the existing picker test file; extend it)

- [ ] **Step 1: Write the failing tests**

```tsx
it('creates a cotización for the row that was clicked', async () => {
  renderPicker()
  fireEvent.click((await screen.findAllByRole('button', { name: /Solicitar cotizaci[óo]n/ }))[0])
  await waitFor(() => {
    expect(mockCreateQuote).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: 'b1' }),
    )
  })
})

it('opens the returned document url in a new tab', async () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  renderPicker()
  fireEvent.click((await screen.findAllByRole('button', { name: /Solicitar cotizaci[óo]n/ }))[0])
  await waitFor(() => {
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/documents/'), '_blank')
  })
})

it('shows an error and does not navigate when creation fails', async () => {
  mockCreateQuote.mockResolvedValue({ data: null, error: 'boom' })
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  renderPicker()
  fireEvent.click((await screen.findAllByRole('button', { name: /Solicitar cotizaci[óo]n/ }))[0])
  await screen.findByText(/boom|Error/)
  expect(openSpy).not.toHaveBeenCalled()
})

it('does not create a quote merely by selecting a business', async () => {
  // Selecting must stay free. One deliberate action, one document.
  renderPicker()
  fireEvent.click(await screen.findByText('PetPickup RD'))
  expect(mockCreateQuote).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/__tests__/transport/`
Expected: FAIL — no such button.

- [ ] **Step 3: Implement**

Add a secondary action beside each row's existing price (`:74`), taking the pet and route context as props from `transport-creation-form.tsx`:

```tsx
  const [quotingFor, setQuotingFor] = useState<string | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const handleRequestQuote = async (b: MarketplaceBusiness) => {
    setQuotingFor(b.business_id)
    setQuoteError(null)
    const { data, error } = await createQuote({
      business_id: b.business_id,
      from, to, size, weight_lb: weightLb,
      pet_name: petName,
      pickup_address: pickupAddress,
      dropoff_address: dropoffAddress,
    })
    setQuotingFor(null)
    if (error || !data) {
      setQuoteError(error ?? tt('marketplace.quote_error'))
      return
    }
    window.open(data.url, '_blank')
  }
```

Button markup — `rounded-xl`, Font Awesome icon sized with `text-*`:

```tsx
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRequestQuote(b) }}
                disabled={quotingFor === b.business_id}
                className="mt-2 px-3 py-1.5 text-xs font-medium rounded-xl border hover:bg-accent disabled:opacity-60"
              >
                <FontAwesomeIcon icon={faFileInvoiceDollar} className="text-xs mr-1.5" />
                {quotingFor === b.business_id
                  ? tt('marketplace.quote_loading')
                  : tt('marketplace.request_quote')}
              </button>
```

`e.stopPropagation()` is required — the row itself is clickable for selection, and without it requesting a quote would also select the business and fire the confirmation quote.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run components/__tests__/transport/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/transport/transport-business-picker.tsx components/transport/transport-creation-form.tsx components/__tests__/transport/
git -C /home/noob_master/pelu/frontend commit -m "feat(transport): let a member request a cotización from the picker"
```

---

### Task 3: Translations

**Files:**
- Modify: `public/locales/es/transport.json`, `public/locales/en/transport.json`

- [ ] **Step 1: Spanish first**

Under `marketplace`:

```json
"request_quote": "Solicitar cotización",
"quote_loading": "Generando…",
"quote_error": "No se pudo generar la cotización",
"quote_opened_hint": "Tu cotización se abrió en una pestaña nueva. Puedes guardarla en PDF o enviarla por correo desde allí."
```

- [ ] **Step 2: English**

```json
"request_quote": "Request a quote",
"quote_loading": "Generating…",
"quote_error": "Could not generate the quote",
"quote_opened_hint": "Your quote opened in a new tab. You can save it as a PDF or email it from there."
```

- [ ] **Step 3: Verify parity**

```bash
python3 -c "import json;a=json.load(open('public/locales/es/transport.json'));b=json.load(open('public/locales/en/transport.json'));print(len(a),len(b))"
```

Expected: equal counts. All six namespaces were exact before this plan.

- [ ] **Step 4: Commit**

```bash
git -C /home/noob_master/pelu/frontend add public/locales/
git -C /home/noob_master/pelu/frontend commit -m "i18n: add cotización strings"
```

---

### Task 4: Verification

- [ ] **Step 1:** `npx vitest run` — everything passes except the known `design-system.test.ts` failure with its 7 pre-existing violations.
- [ ] **Step 2:** `npx tsc --noEmit` — clean, exit 0.
- [ ] **Step 3:** Locale parity across all six namespaces.
- [ ] **Step 4:** Browser check against the running stack: pick a business, request a cotización, confirm the document opens, reads correctly, and **print-previews without clipping**. The print stylesheet lives in the API and cannot be verified from this repo's tests.
- [ ] **Step 5:** Do **not** run `bun run build`.

---

## Done criteria

- [ ] Requesting a quote creates exactly one document and opens it
- [ ] Merely selecting a business creates nothing
- [ ] A failure shows an error and does not open a tab
- [ ] `npx tsc --noEmit` clean; locale parity exact
- [ ] No document component exists in this repo

## Report back

Include actual test output, plus a note on how the document looked in print preview, and answer: **what in this plan turned out to be wrong?**
