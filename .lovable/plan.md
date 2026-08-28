# Fix WholesalerFlow sheet-length suggestion — `src/routes/upload.tsx` ONLY

Scope: a single file, `src/routes/upload.tsx`. No other file changes.

## Defects

1. `suggested` (line ~328) is computed from `height_px / 300` and only rendered as hint text — never written into `lengthIn`, which stays hardcoded at `60`.
2. The suggestion reads only `height_px`, so a rotated sheet (18000×6600) reports `~22"` instead of `60"`. 22" floors to the 3 ft minimum and mis-bills.
3. Hint text states a false "at 300 DPI" assumption and asks the customer to "confirm" a number that was never placed in the field.
4. Cart label still says `"Wholesaler sheet"` (jargon we already removed from the mode toggle).

## Edits (all inside `WholesalerFlow`, lines ~307–380)

### Edit A — Replace the `suggested` derivation (lines ~327–329)

Replace the orientation- and DPI-blind `suggested` const with an aspect-ratio derivation. Use the uploaded sheet's pixel dimensions: the 22" edge is the **short** side, the length is the **long** side.

```tsx
// Detect sheet dimensions from the pixel aspect ratio (22" is always the short edge).
const detected = useMemo(() => {
  const w = upload?.width_px;
  const h = upload?.height_px;
  if (!w || !h) return null;            // PDFs: dimensions not read
  const shortSide = Math.min(w, h);      // the 22" edge
  const longSide = Math.max(w, h);       // the length edge
  const suggestedIn = Math.round((longSide * 22) / shortSide);
  const dpi = Math.round(shortSide / 22);
  return { suggestedIn, dpi };
}, [upload?.id]);
```

Notes:
- No `/300` divisor anywhere. A 3300×9000px (150 DPI) sheet and a 6600×18000px (300 DPI) sheet both report `60`.
- Orientation-agnostic: 6600×18000 and 18000×6600 both yield `60`.

### Edit B — Apply the prefill on a NEW upload only (new `useEffect`)

Key the effect on `upload?.id` — this value changes **only** when a different file is uploaded. It does **not** change on re-renders caused by typing into the length field, toggling mode, or any other state mutation. This is the dependency that prevents clobbering a manual edit.

```tsx
import { useEffect } from "react";   // add to the existing react import on line 3

useEffect(() => {
  if (!detected) return;                          // PDF / null dims → do not touch the field
  const clamped = Math.min(360, Math.max(36, detected.suggestedIn));
  setLengthIn(clamped);
}, [upload?.id]);   // intentionally NOT depending on `detected` — see (a) below
```

(a) **Mechanism / dependency key:** The effect's dependency array is `[upload?.id]`. `upload?.id` is a stable string that only changes when a genuinely new file lands (the uploads API returns a fresh row id per upload). A customer typing into the Length field mutates `lengthIn` only — `upload?.id` is unchanged, so the effect does not re-fire and the typed value survives. `detected` is derived inside a `useMemo` keyed on the same `upload?.id`, so reading `detected` inside the effect is safe without listing it (it is settled before the effect runs for that id). ESLint's exhaustive-deps may warn; the intentional omission is correct here because we want the prefill to fire exactly once per upload, not on every recomputation.

(b) **Null/zero dimensions (PDFs):** `detected` returns `null` when `width_px` or `height_px` is falsy. The effect early-returns without calling `setLengthIn`, so the field keeps its current value. The hint block (Edit C) renders a "could not detect length, enter it manually" note instead of dimensions.

(c) **Clamping:** `Math.min(360, Math.max(36, suggestedIn))` —
   - Lower bound `36` (3 ft minimum). A sub-3ft detection (e.g. the rotated 22" case now correctly maps to length, but a tiny file could still compute below 36) is floored to 36.
   - Upper bound `360` (30 ft maximum, matching `snapToFoot`'s 3–30 ft range). A 40 ft detection caps at 360.
   - The field remains freely editable afterward (Edit D's `onChange` is untouched). The clamp only governs the prefill value.

### Edit C — Replace the hint block (lines ~375–379)

Replace the static "From your file at 300 DPI" line with detected-dimension text. Show the detected sheet size (`22″ × {suggestedIn}″`), the implied DPI (`shortSide / 22`, rounded), and a low-res caution when DPI < 150. For PDFs, show a manual-entry note.

```tsx
{detected ? (
  <p className="mt-2 text-xs text-stone">
    Detected: 22″ × {detected.suggestedIn}″ · ~{detected.dpi} DPI.
    {detected.dpi < 150 && " Low resolution for print — consider re-exporting at a higher DPI."}
    Adjust if needed.
  </p>
) : upload ? (
  <p className="mt-2 text-xs text-stone">
    Length could not be detected from this file — enter it manually.
  </p>
) : null}
```

No separate warning component, modal, or blocking state — text note in the existing hint area only.

### Edit D — Cart label wording (line ~343)

Change the display string only:

```tsx
label: `Gang sheet · ${lengthIn}″`,
```

`kind: "wholesaler"`, the `mode: "wholesaler"` argument to `getQuote`, `computeWholesalerSheet`, `priceBreakdown`, `snapToFoot`, `priceForFeet`, and the add-to-cart path are all unchanged. The `onChange` on the `NumField` (line ~372) is also untouched — the field stays freely editable.

## Out of scope (must not change)

DiyFlow, `src/lib/pricing-core.ts`, any `*.functions.ts` / `*.server.ts`, `getQuote`, `DropZone`, `src/components/upload/DropZone.tsx`, the uploads API route, checkout, cart store internals, admin, `styles.css`, the mode/search-param logic from the prior change, and `__root`/header/footer. The `validateSearch` and `UploadFlow` mode-toggle work remains byte-stable.

## Verification

- 6600×18000 sheet → field prefills to `60`, hint reads `22″ × 60″ · ~300 DPI`.
- 18000×6600 (rotated) sheet → same `60`, same hint (orientation-agnostic).
- 3300×9000 sheet (150 DPI) → field prefills to `60`, hint reads `~150 DPI` (no low-res caution, boundary case).
- Sub-150 DPI sheet (e.g. 1650×4500, ~75 DPI) → prefill `60`, hint shows the low-res caution.
- Tiny sheet computing < 36" → prefill clamps to `36`.
- Huge sheet computing > 360" → prefill clamps to `360`.
- PDF upload (null dims) → field stays at prior value, hint says "enter it manually".
- Type a custom length after upload → value survives re-renders; only a new file re-applies the prefill.
- Cart line item reads `Gang sheet · 60″`; `kind` and quote args unchanged.
