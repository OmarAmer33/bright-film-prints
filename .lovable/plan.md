## Fix multi-sheet pricing bug — one print job = one cart item

### Root cause (confirmed)

`src/routes/upload.tsx` loops over `quote.lines` and pushes one cart item per breakdown line, each carrying the full `job_qty`/`design_w`/`design_h`. At checkout, `createCheckout` recomputes each cart item from those dimensions via `computeSheet`, so a job that auto-splits into N lines is repriced N times. Cart subtotal is correct (it sums precomputed `line_total`s); Stripe gets `N × full_quote`. Same module also has the parked D2/D2c tampering gap guarded by `quote.lines.length === 1`.

### Changes

**1. `src/lib/pricing-core.ts`** — add `normalizeBreakdown(breakdown)` that merges same-`size_ft` entries (sum counts, preserve tier order) and reuse it in `breakdownForLength` so callers always get the merged shape. Export a stable comparator `breakdownsEqual(a, b)`.

**2. `src/lib/cart-store.ts`** — `CartItem` now represents a whole job:
```
{ id, source, kind: "diy" | "wholesaler",
  design_w?, design_h?, job_qty?,        // DIY
  length_in?,                            // wholesaler
  upload_id?, preview_url?, label?, per_piece?,
  breakdown: { size_ft, count, unit_price, line_total }[],  // normalized
  line_total }                           // = sum of breakdown.line_total
subtotal() = Σ item.line_total
```
Bump persist key to `bt-cart-v2` so v1 carts (with stale shape) don't render junk; old carts simply clear on first load.

**3. `src/routes/upload.tsx`** — DIY (~206) and wholesaler (~329): replace the `for (const line of quote.lines) addItem(...)` loop with a single `addItem({ ...job context, breakdown: normalized, line_total: quote.subtotal })`.

**4. `src/routes/cart.tsx`** — one row per item. Title = `label` (e.g. `1200 × 4″×4″ prints`). Sub-line renders the merged breakdown: `3 × 30 ft sheet`, or `2 × 30 ft + 1 × 5 ft` if mixed. Show `per_piece` when present. Row total = `line_total`. Remove deletes the job. Checkout payload sends one entry per item:
```
{ source, design_w, design_h, job_qty, length_in, upload_id,
  claimed_breakdown: item.breakdown.map(b => ({size_ft, count})) }
```

**5. `src/lib/checkout.functions.ts`**:
- Drop `claimed_size_ft` / `claimed_sheet_count`; add `claimed_breakdown: { size_ft, count }[]` (validated per entry).
- For each input item: recompute ONCE via `computeSheet` / `computeWholesalerSheet` + `buildQuote`, normalize the resulting breakdown.
- Tampering check: normalize `claimed_breakdown`, compare tier-by-tier with the recomputed normalized breakdown via `breakdownsEqual`. Mismatch → throw with the diff (`claimed [{3,1}] vs computed [{30,3}]`). Applies regardless of line count → closes D2/D2c.
- Server reprice from the recomputed breakdown stays authoritative.
- Persist one `order_items` row per resolved sheet tier (same shape as today, but driven by the per-item recomputed breakdown rather than the cross-item `resolved` flat list — keeps DB shape unchanged for the webhook + order detail page).
- `subtotal` = Σ per-item `line_total`. Stripe single combined line item unchanged.

**6. `src/routes/api/public/stripe.webhook.ts`** — remove the temporary `[whsec check]` `console.error`. Keep `constructEventAsync` and the existing `signature verify failed` error log.

### Out of scope

- Test-data cleanup migration (separate step).
- `has_role` warn-level finding (left as-is per instruction).

### Verification (run after build, report each)

1. **1200×4×4 (DIY)** — cart shows one row `3 × 30 ft sheet`, subtotal **$419.97**. `createCheckout` Stripe session `amount_total` = **$419.97** (not $839.94). Report the session amount from Stripe + the resulting `orders.total`.
2. **12×4×4 (single 3 ft)** — one row, **$19.99** + shipping, unchanged.
3. **D2 tampering** — 4×10×200 with `claimed_breakdown: [{size_ft:3,count:1}]` → server rejects with mismatch message naming claimed vs computed. Honest `claimed_breakdown` → accepted.
4. **Happy-path paid flip** — fresh 4242 checkout → webhook 200 → order `status='paid'` (constructEventAsync intact).
5. **SQL** — `select id, status, total, tax, stripe_payment_intent_id, created_at from orders order by created_at desc limit 5;` and paste the result.

### Risk notes

- v1→v2 cart key bump silently clears existing local carts on next page load. Acceptable for a pricing-correctness fix; users re-add the items they actually wanted.
- DB schema unchanged — only the shape of what the client sends and how the server iterates inputs changes; `order_items` row count per order may drop (no more duplicated rows from cross-item recompute), which is the intended correction.
