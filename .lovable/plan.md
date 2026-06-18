
# Plan: Home page copy fixes + logo (Claude round 2, approved)

Logo received — sun-with-sunglasses sticker. I'll wire it in as the header mark.

## 1. Hero — lead with price, drop "no minimums"
- Eyebrow unchanged: `DTF Gang Sheets`.
- Headline (gradient accent on one phrase):
  > **Brighter prints at a <span class="gradient">brighter price</span>.**
  Fallback if it reads ambiguous in the render: `Brighter prints, better price.`
- Subhead (removes "no minimums" and "same business day"):
  > Hot-peel DTF gang sheets priced by the square foot — the bigger the sheet, the lower the rate. 3 ft minimum, shipped fast.

## 2. Pricing teaser — locked-table rows + "Best value"
| Size  | Price    | Per sq ft     | Badge |
|-------|----------|---------------|-------|
| 3 ft  | $19.99   | $3.63 / sq ft | `Length` |
| 10 ft | $54.99   | $3.00 / sq ft | **`Best value`** (featured ring stays) |
| 30 ft | $139.99  | $2.55 / sq ft | `Length` |

## 3. Soften turnaround in three places
- Hero subhead: covered above.
- How-it-works step 03: title `Ships the same day` → `Printed & shipped fast`; body → "We print, QC, and hand off to the carrier quickly. Free shipping over $75."
- Closing CTA subhead: drop "usually same day" → "Upload a PNG, pick a size, and we'll get it printed and on its way."

`PriceTicker` (`3 ft · $19.99 · $3.63 / sq ft`) unchanged — factual.

## 4. Logo wiring
- Upload `/mnt/user-uploads/image.png` via `lovable-assets create --filename bright-transfers-logo.png` → write pointer to `src/assets/bright-transfers-logo.png.asset.json`.
- In `SiteHeader.tsx`:
  - Replace the gradient "B" badge with `<img src={logo.url} alt="Bright Transfers" className="h-10 w-10 object-contain" />`.
  - Keep the "Bright Transfers" wordmark next to it (sun mark + wordmark lockup — eliminates the double-B). Drop the gradient span on `Transfers` so the wordmark reads as a single ink lockup beside the sun (the sun carries the color now).
- Hi-res swap later is still a one-file change (replace the `.asset.json`).

## 5. Verify
- Build green + preview health healthy.
- Capture mobile (390×844) + desktop (1366×768) screenshots of `/` for Claude.

## Out of scope
Tokens, typography, component APIs, routes, pricing logic, SEO/JSON-LD.

## Files touched
- `src/assets/bright-transfers-logo.png.asset.json` (new)
- `src/components/brand/SiteHeader.tsx`
- `src/routes/index.tsx`

Approve and I'll build.
