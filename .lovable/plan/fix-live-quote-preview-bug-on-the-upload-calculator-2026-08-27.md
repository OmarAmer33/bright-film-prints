# Fix live-quote preview bug on the upload calculator

## Problem

The upload page (`src/routes/upload.tsx`) shows `$0.00` in the live preview for any non-anchor sheet size (e.g. 17 ft). The actual cart charge is correct (it uses the server `getQuote`, which interpolates via `priceForFeet`), but the on-page preview does not match the charge.

Root cause: two inline blocks (DIY flow and Wholesaler flow) reimplement price lookup as an **exact-match** `Map` keyed by `size_ft`. Any foot value that isn't one of the 7 anchor rows (3, 5, 7, 10, 15, 20, 30) has no map entry, so `lookup.get(b.size_ft)` returns `undefined` → `0`. After the per-foot interpolation change, `comp.breakdown` now contains non-anchor feet (e.g. 17 ft), so the preview shows $0 while the server charges the interpolated price.

## Scope

**Single file: `src/routes/upload.tsx` only.** No changes to `pricing-core.ts`, `getQuote`, `checkout.functions.ts`, `pricing.functions.ts`, the pricing page, or any other file.

## Fix

Replace both inline exact-match `Map` lookups with a single call to `priceBreakdown` from `pricing-core` (which interpolates via `priceForFeet`), so the preview matches the server charge exactly.

### 1. Import `priceBreakdown`

Add `priceBreakdown` to the existing `pricing-core` import:

```ts
import {
  computeSheet,
  computeWholesalerSheet,
  priceBreakdown,
  USABLE_WIDTH,
  type SheetComputation,
} from "@/lib/pricing-core";
```

### 2. DIY flow — replace inline block (lines 180-189)

Current:
```ts
const livePricing = pricing?.tiers ?? [];
const liveLines = useMemo(() => {
  const lookup = new Map(livePricing.map((r) => [r.size_ft, r.price]));
  return comp.breakdown.map((b) => {
    const unit = Number(lookup.get(b.size_ft) ?? 0);
    return { ...b, unit_price: unit, line_total: unit * b.count };
  });
}, [comp.breakdown, livePricing]);
const subtotal = liveLines.reduce((s, l) => s + l.line_total, 0);
const perPiece = qty > 0 ? subtotal / qty : 0;
```

Replace with:
```ts
const livePricing = pricing?.tiers ?? [];
const { lines: liveLines, subtotal } = useMemo(
  () => priceBreakdown(comp.breakdown, livePricing),
  [comp.breakdown, livePricing],
);
const perPiece = qty > 0 ? subtotal / qty : 0;
```

`liveLines` keeps the same shape (`{ size_ft, unit_price, count, line_total }[]`), so the `QuotePanel` prop wiring is unchanged.

### 3. Wholesaler flow — replace inline block (lines 310-318)

Current:
```ts
const livePricing = pricing?.tiers ?? [];
const lines = useMemo(() => {
  const lookup = new Map(livePricing.map((r) => [r.size_ft, r.price]));
  return comp.breakdown.map((b) => {
    const unit = Number(lookup.get(b.size_ft) ?? 0);
    return { ...b, unit_price: unit, line_total: unit * b.count };
  });
}, [comp.breakdown, livePricing]);
const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
```

Replace with:
```ts
const livePricing = pricing?.tiers ?? [];
const { lines, subtotal } = useMemo(
  () => priceBreakdown(comp.breakdown, livePricing),
  [comp.breakdown, livePricing],
);
```

`lines` keeps the same shape and name, so the downstream JSX that renders the wholesaler line items is unchanged.

## Why this is safe

- `priceBreakdown` returns `{ lines: PricedLine[], subtotal: number }` where each `PricedLine` has exactly `{ size_ft, unit_price, count, line_total }` — the same fields the inline blocks produced, so every consumer (`QuotePanel`, the wholesaler summary JSX) is unaffected.
- Both client preview and server `getQuote` already route through `pricing-core`'s `priceBreakdown`/`priceForFeet`, so the preview will now equal the charge by construction (same math, same anchors).
- The checkout tampering check (`breakdownsEqual`) and amount reconciliation in `checkout.functions.ts` are untouched and already use the same interpolated math — no behavior change there.

## Verification

- Typecheck: `npx tsgo --noEmit` passes.
- Manual: on `/upload`, DIY mode, pick dimensions that produce a non-anchor sheet length (e.g. a 17 ft breakdown). The live preview subtotal is now the interpolated price (not $0.00) and matches what "Add to cart" charges via `getQuote`.
- Wholesaler mode: set length to a non-anchor value (e.g. 17 ft) — preview subtotal matches the interpolated price.
