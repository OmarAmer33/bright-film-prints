# Phase 1 — PDF dimension detection (true physical size)

Adds PDF size reading only. No pricing logic changes, no field removal.

## 1) Migration

```sql
ALTER TABLE public.uploads
  ADD COLUMN width_in numeric,
  ADD COLUMN height_in numeric;
```

Nullable, no defaults, no backfill, no RLS/grant/column changes. Existing rows keep null.

## 2) `src/lib/image-dims.server.ts` — new `readPdfDims`

`readImageDims` and its PNG/JPEG parsers stay byte-identical. Append:

```ts
export async function readPdfDims(bytes: Uint8Array): Promise<{ width_in: number; height_in: number } | null>
```

Logic: `PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false })` → `doc.getPage(0)`; read MediaBox via `page.getMediaBox()` (points), rotation via `page.getRotation().angle`, UserUnit from the page dict. Convert: `inches = points / 72 * userUnit`. Swap width/height when `angle % 360` is 90 or 270. Wrapped in try/catch returning `null` on any failure (encrypted, corrupt, missing MediaBox, zero dims).

Note: this function is async (pdf-lib's `load` is a Promise), unlike the sync `readImageDims`. The upload route already runs in an async handler, so this is a local change only.

### (i) Does pdf-lib run in this Worker runtime?

pdf-lib 1.17.1 is pure JavaScript — its only dependencies are `@pdf-lib/standard-fonts`, `@pdf-lib/upng`, `pako`, and `tslib`, all pure JS with no native addons, no `node-gyp`, no `child_process`, and no filesystem access. That satisfies the Worker constraints on paper. I verified the dependency tree from the registry rather than assuming; I have **not** yet executed it inside workerd. So implementation starts with a runtime smoke test: install the package, hit `POST /api/uploads/upload` with a real PDF against the dev server, and confirm a parsed MediaBox comes back with no `[unenv] … not implemented` or bundling error. If that smoke test fails, I stop and report before wiring anything else — I will not ship an unverified parser.

### (ii) Reading /Rotate and /UserUnit

- `/Rotate`: `page.getRotation().angle` — pdf-lib resolves the inherited page-tree value; normalize with `((angle % 360) + 360) % 360` and swap on 90/270.
- `/UserUnit`: not surfaced by a typed getter, so read the raw page dict: `page.node.get(PDFName.of('UserUnit'))`, and when it is a `PDFNumber`, take `.asNumber()`. Default `1`. Guard against non-finite or `<= 0` values by falling back to 1.

### (iii) Multi-page PDFs

Page 1 only. `doc.getPage(0)` is used and the remaining pages are ignored — a gang sheet is a single page by definition, and guessing at a combined size across pages would be worse than one clear rule. No error, no warning; the detected size is page 1's size.

## 3) `src/routes/api/uploads.upload.ts`

- PNG/JPEG branch unchanged (`readImageDims`).
- New branch: `if (mime === "application/pdf") pdfDims = await readPdfDims(bytes)`.
- Insert row with `width_in: pdfDims?.width_in ?? null, height_in: pdfDims?.height_in ?? null` alongside the untouched `width_px`/`height_px`.
- Response JSON gains `width_in` and `height_in`.
- `MAX_BYTES`, `ALLOWED`, `EXT`, storage upload, signed URL: untouched. Raster path behaves identically.

## 4) `src/routes/upload.tsx` (read path only)

One scope note: `UploadResult` is declared in `src/components/upload/DropZone.tsx`, which is on the do-not-touch list. So instead of editing that type, `upload.tsx` declares a local widening type — `type UploadWithInches = UploadResult & { width_in?: number | null; height_in?: number | null }` — and reads through it. No DropZone change.

**Named assumption — DropZone pass-through.** The local widening type only works because DropZone.tsx line 31 parses the response body and line 35 hands that same object straight to `onUploaded` — it does not rebuild a fixed shape, so `width_in` / `height_in` survive at runtime even though they are absent from the `UploadResult` type. This is a load-bearing implicit dependency: if DropZone is ever changed to destructure or re-map the response, this breaks silently — no type error, no runtime error; the PDF path just falls back to pixels forever. The verification steps below therefore confirm `width_in` actually **arrives in WholesalerFlow** after a PDF upload, not merely that the API response contains it.

In `WholesalerFlow`'s `detected` useMemo, before the pixel path:

- If `width_in` and `height_in` are both present and > 0: `shortSide = min`, `longSide = max`, `suggestedIn = Math.round(longSide)`, `clampedIn = Math.min(360, Math.max(36, suggestedIn))`, `source: "file"`, no `dpi`.
- Otherwise: the current pixel aspect-ratio path, unchanged, `source: "pixels"`.

Hint text: for `source: "file"`, read `Detected from your PDF: {shortIn}″ × {clampedIn}″.` plus the existing clamp notes (3 ft minimum / 30 ft maximum), and **no DPI figure or low-res caution**. `shortIn` is the raw division result, so format it with `Number(shortSide.toFixed(1))` — at most one decimal, trailing `.0` dropped. An exact 22" sheet renders `22″ × 60″`; a slightly-off MediaBox (1581.6 pt) renders `22″ × 60″` still, and a genuinely odd width (21.5") renders `21.5″ × …` — never `21.97222222222″`. For `source: "pixels"`, the current hint renders unchanged.

Unchanged: the length input, its `onChange`, the prefill `useEffect` (still keyed on `upload?.id`), the 36–360 clamp, and the cart label.

## Out of scope

`pricing-core.ts`, `pricing.functions.ts`, `checkout.functions.ts`, `getQuote`, `computeWholesalerSheet`, cart store, checkout, admin, DiyFlow, DropZone, mode/search-param logic, every other route.

## Verification

- Worker smoke test (above) before anything else.
- 22×60 in PDF (`[0 0 1584 4320]`) → field prefills 60, hint shows 22″ × 60″, no DPI.
- Same MediaBox with `/Rotate 90` → still 60 (swap applied).
- Long sheet using `/UserUnit 2` → doubled inches, not underbilled.
- Encrypted / corrupt PDF → null, field untouched, existing manual-entry note shows.
- PNG and JPEG uploads → identical response and hint to today.
