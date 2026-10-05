# Phase 2 — Server-authoritative gang-sheet length

`upload_id` becomes the input; `length_in` becomes an output derived on the server from the `uploads` row. No migration, no dependency changes, no edits to existing pricing math.

## Edits by file

**1. `src/lib/pricing-core.ts`** (additions only)
- `export const SHEET_WIDTH_IN = 22;`
- `export function deriveSheetLengthIn(dims)`:
  - `width_in` and `height_in` both > 0 → `round(max(w,h))`
  - else `width_px` and `height_px` both > 0 → `round(max * 22 / min)`
  - else `null`
  - result is `Math.max(36, raw)`. **No upper bound.** Lengths over 360" go through the existing `breakdownForLength` split (whole 30 ft sheets + remainder).
- `priceForFeet`, `priceBreakdown`, `snapToFoot`, `breakdownForLength`, `computeSheet`, `computeWholesalerSheet`, `normalizeBreakdown` are not touched.

**2. `src/lib/sheet-length.server.ts`** (new)
- `resolveSheetLengthIn(upload_id)`: loads `supabaseAdmin` with `await import("@/integrations/supabase/client.server")` inside the function, selects `width_px, height_px, width_in, height_in` by id with `.maybeSingle()`, and runs `deriveSheetLengthIn`.
- A missing row, a query error or a `null` result throws `"We couldn't read the size of that file. Please re-upload it."` It fails closed and never falls back to a number from the client.

**3. `src/lib/pricing.functions.ts`**
- `QuoteInput`: `length_in?: number` becomes `upload_id?: string`.
- `validateQuoteInput`: the `length_in` line (line 91) is removed. It adds `upload_id: typeof r.upload_id === "string" ? r.upload_id : undefined`. The existing "silently dropped" comment is extended to cover `length_in`.
- Wholesaler branch (line 113): if `upload_id` is missing it throws the same customer-safe message. Otherwise it uses `computeWholesalerSheet({ length_in: await resolveSheetLengthIn(data.upload_id) })`. Nothing after that changes.

**4. `src/lib/checkout.functions.ts`**
- Removes `length_in` from `CheckoutLineInput` (line 25) and from the validator (line 68).
- Discriminator (line 181) becomes `item.upload_id && !item.design_w && !item.design_h`.
- Branch (line 184) becomes `computeWholesalerSheet({ length_in: await resolveSheetLengthIn(item.upload_id!) })`.
- These stay as they are: the `claimed_breakdown` check, the DIY/builder branch, `length_in: comp.length_in` in `jobs.push` (line 222, now server-derived), and the `upload:<uuid>` notes format (lines 277–278).

**5. `src/routes/upload.tsx`** (WholesalerFlow only)
- Removes `useState(60)` for `lengthIn`, the prefill `useEffect`, and the `NumField`.
- `lengthIn = deriveSheetLengthIn(upload ?? {})`, which can be `null`. `comp` and the live quote use it, and show empty when it is `null`.
- The `detected` useMemo now only builds display facts: the true PDF size (short side, one decimal), or the DPI (`round(short_px / 22)`) plus the existing caution below 150 DPI. Raw length (before the 36" minimum) is used only to decide whether to show the minimum note. The inline length math and the `Math.min(360, …)` clamp are deleted.
- Copy: the heading hint becomes "Read from your file — every sheet is 22″ wide". The length shows as read-only text (e.g. "Your sheet: 22″ × 148″"). Notes:
  - "3 ft minimum sheet applies." when the minimum raised the length
  - "Longer than 30 ft — prints as N sheets (see quote)." when length > 360
  - "Adjust if needed" is removed
  - Unreadable file: "We couldn't read the size of that file. Please re-upload it." The Add-to-cart button is disabled.
- Quote call: `{ mode: "wholesaler", upload_id: upload.id }`.
- `addItem`: no `length_in`. The label and the display `length_in` come from the server quote (`q.length_in`, which `buildQuote` already returns), so the label always matches what was priced.

**6. Cart**
- `src/lib/cart-store.ts` line 25: keeps `length_in?` with the comment "Display-only (label). Checkout ignores it and derives length server-side from upload_id." `kind: "wholesaler"` does not change.
- `src/routes/cart.tsx` line 77: removes `length_in: i.length_in` from the checkout payload. It is required for typecheck once the field leaves `CheckoutLineInput`; the server would drop it anyway.

## a) `length_in` call sites

Touched:
- `pricing.functions.ts` 73, 91, 113–114
- `checkout.functions.ts` 25, 68, 181, 184
- `upload.tsx` 325, 329, 345, 356, 374, 378, plus the label and the NumField
- `cart.tsx` 77
- `cart-store.ts` 25 (comment only)

Left as they are:
- `pricing-core.ts` 15, 102–133, 173, 209 (existing math and types)
- `checkout.functions.ts` 168, 222, 278 (the resolved job's length, now server-derived)
- `upload.tsx` 518 (DIY `Meta` display of computed length)

## b) Unreadable dimensions
- **On the upload page:** no number is shown, Add to cart is disabled, and the re-upload message appears. If a quote is forced anyway, the server throws the same message and the existing catch shows "Couldn't add to cart."
- **At checkout:** `resolveSheetLengthIn` throws, the whole checkout is rejected before any Stripe session or order row is created, and the customer sees the same re-upload message through the cart's existing error display. No client number is used.

## c) Cart items made before this change
They can reach checkout. The cart is persisted in the browser and still has `upload_id`, which is all the new discriminator needs.
- **If the typed length matched the file** (the default prefill, under 30 ft): the server-derived breakdown matches `claimed_breakdown` and checkout succeeds.
- **If the customer had edited the length, or the file is over 30 ft** (the old clamp billed 360): the tampering check rejects it with the existing "claimed sheet breakdown does not match computed…" message. The customer has to remove the item and add it again. That message is technical. I'm leaving it as specified, but noting it.
- **Old DIY items** keep `design_w`/`design_h`, so they still take the DIY branch.

## Observation (not in scope, no change)
`resolveSheetLengthIn` reads any upload by id with admin rights and does not check that the caller owns it. That only reveals a derived length and price, not the file. Adding an ownership check could block guest uploads (`customer_id` null), so I'd do it as a separate change if you want one.
