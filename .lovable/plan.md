## Step 13.3 (revised) — Server fns, upload pipeline, gang-sheet auto-calculator

Builds the first revenue-config path. No Stripe, no loyalty, no admin, no live AI tools. "Sharpen this?" and upscale fee are stubs.

### A. Settings + storage prerequisites

1. Migration: insert `settings` rows `upscale_fee = 2.49`, `bg_removal_fee = 0`. All fees read from `settings` — never hardcoded.
2. Create private Storage bucket `uploads` via storage tool. RLS on `storage.objects` restricts to service role only; clients never touch Storage directly — they post to a server route that streams via admin client.
3. Verify anon SELECT policies exist on `pricing_config` (active only) and `settings` (safe keys) so home + calculator can read live pricing through the server publishable client during SSR. Add narrow policies if missing.

### B. Quote / pricing server module (authoritative)

- `src/lib/pricing.server.ts` — pure, **no secrets, no env access** (safe to import client-side for live display):
  - Constants `TIERS_IN = [36,60,84,120,180,240,360]`, `GAP = 0.125`, `USABLE_WIDTH = 21.875`.
  - `computeSheet({ design_w, design_h, qty })` → `{ per_row, rows, length_in, breakdown: [{ size_ft, count }], over_width }`. Implements the spec formula exactly including auto-split over 360".
  - `computeWholesalerSheet({ length_in })` → snap to tier.
  - `priceBreakdown(breakdown, pricingRows)` — used server-side only.
- `src/lib/pricing.functions.ts`:
  - `getPricing` (public, server publishable client) → active `pricing_config` rows + relevant `settings`.
  - `getQuote` (public). `inputValidator` accepts **only dimensions/qty** — no prices, no tier names, no per_sqft. `{ mode: 'diy'|'wholesaler', design_w?, design_h?, qty?, length_in? }`. Handler loads pricing fresh from DB and recomputes authoritative `{ breakdown, subtotal, per_piece, lines, over_width }`. Client never sends prices.

### C. Upload pipeline

- Server **route** `src/routes/api/uploads.upload.ts` (POST, multipart). `createServerFn` doesn't stream binary well; route uses `supabaseAdmin` loaded inside the handler.
  - Accepts PNG/JPG/PDF ≤ 50MB. Validates mime + size.
  - Streams to `supabaseAdmin.storage.from('uploads').upload('{uuid}.{ext}', ...)`.
  - Pure-JS header parser for PNG (IHDR) and JPEG (SOF) to get pixel dims. **Fails gracefully**: any throw or unrecognized header → log + set `width_px/height_px = null`, skip DPI, still complete the upload. Never blocks a sale on a header parse miss.
  - PDFs: accept, dims = null (DPI check is raster-only).
  - Inserts `uploads` row (`customer_id = null` for guests, `status = 'pending'`).
  - Returns `{ id, signed_url, width_px, height_px }` (signed URL ~24h).
- `src/lib/uploads.functions.ts` → `getUploadSignedUrl(id)` re-mints.

### D. Home page: live pricing read

Replace hardcoded `tiers` in `src/routes/index.tsx > PricingTeaser` with loader-fed data:

- Add route `loader` calling `getPricing()`, filter to [3, 10, 30], keep "Best value" on 10 ft. Render via `useLoaderData`. Zero visual change.
- Add `errorComponent` + `notFoundComponent` to satisfy boundary rule. Error fallback uses static tiers so home never blanks.

### E. Upload page — calculator + DPI + presets

Rewrite `src/routes/upload.tsx` (drop `ComingSoon`):

```text
┌─────────────────────────────────────────────┐
│ 1. Mode toggle: [DIY art] [Wholesaler sheet]│
├─────────────────────────────────────────────┤
│ 2. Drop zone (optional in DIY, required to  │
│    add to cart) — PNG/JPG/PDF ≤50MB         │
├─────────────────────────────────────────────┤
│ 3a. DIY: width-only presets + custom        │
│     [Left chest ~4"] [Youth ~8"]            │
│     [Adult ~11"]    [Full back ~12"]        │
│     [Custom]                                │
│     All presets set TARGET WIDTH only;      │
│     height = width × (art_h / art_w).       │
│     Custom: enter width; height auto from   │
│     uploaded ratio (lock toggle).           │
│     Tag: "Placeholder widths — confirm w/Chai"│
│ 3b. Wholesaler: length confirm input        │
├─────────────────────────────────────────────┤
│ 4. Quantity                                 │
├─────────────────────────────────────────────┤
│ 5. Live quote panel (sticky on desktop):    │
│    - Sheet breakdown (e.g. 2× 30ft + 1× 5ft)│
│    - Total $XX.XX                           │
│    - ~$X.XX per piece                       │
│    - DPI badge if raster (see thresholds)   │
│    - Over-width error + "Rotate 90°?"       │
├─────────────────────────────────────────────┤
│ [Add to cart]                               │
└─────────────────────────────────────────────┘
```

**DPI thresholds (Chai-confirm — flag in code + UI):**

- ≥ 300 → green "print-ready"
- 150–299 → amber "should print well"
- < 150 → amber-red **recommendation**, not a block: "May look soft on fabric — we recommend sharpening." Show "Sharpen this?" CTA → `/tools/upscale` stub. **Add to cart stays enabled.** Comment in code: thresholds soft pending Chai's machine-tested floor (DTF on fabric forgives more than paper; some shops accept ~120).

Components:

- `src/components/upload/Calculator.tsx` — imports pure `computeSheet` from `pricing.server.ts` for live layout. Calls `getQuote` server fn to lock authoritative price before "Add to cart" — sends dims/qty only, never prices.
- `src/components/upload/DropZone.tsx` — drag/drop, posts to `/api/uploads/upload`.
- `src/components/upload/PresetPicker.tsx` — width-only presets, visible "confirm with Chai" tag.
- Rotate-90° button swaps width/height when over-width.

Stub route `src/routes/tools.upscale.tsx` (uses `ComingSoon`, "lands in 13.7").

### F. Cart (client-side only this step)

- `src/lib/cart-store.ts` — Zustand store persisted in `localStorage`. `addItem`, `items`, `removeItem`, `clear`, `subtotal`. Items: `{ source, size_ft, quantity, unit_price, line_total, upload_id?, preview_url? }`. Server `getQuote` is the source of truth for `unit_price` / `line_total`.
- `src/routes/cart.tsx` — minimal list: items, qty, line totals, subtotal, **disabled** "Checkout coming in 13.4" button. Remove-item works.

### G. Verification

1. `getQuote` cases:
   - 4×10 × 12 → per_row=5, rows=3, length=30.5 → 3 ft / **$19.99** ✓
   - 4×10 × 20 → rows=4, length=40.625 → 5 ft / **$30.99** ✓
   - 4×10 × 200 → length≈405 → **1× 30ft + 1× 3ft**, prices summed.
2. Send `getQuote` payload with extra `unit_price: 0.01` fields → response ignores them, returns DB-priced quote (validator strips unknown keys).
3. Home tiles still render 3/$19.99, 10/$54.99, 30/$139.99 from DB.
4. Upload 1200×1200 PNG → row in `uploads`, file in Storage. At 4" print width → 300 DPI green. At 12" → 100 DPI red-recommendation, "Add to cart" still enabled.
5. Upload corrupt PNG → dims null, no DPI badge, upload still completes.

### Out of scope

Stripe/order creation (13.4), loyalty (13.5), admin (13.6), live upscale/bg-removal (13.7), Antigro (13.9).
