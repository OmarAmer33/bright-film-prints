Home page — round 2 visual + copy fixes (5 items). Scope: styling and copy only in `src/routes/index.tsx`, `src/components/brand/SiteFooter.tsx`, and `src/styles.css`. No token system, component API, backend, or header changes.

## 1. Pricing cards — fix dead space on mobile

Current pricing cards stack vertically with tall proportions on mobile, leaving large empty areas.

Change: on screens < 768px, render each pricing card as a single compact horizontal row:
- Left: size + "Best value" badge (when featured)
- Middle: price
- Right: per-sq-ft
Use `flex items-center justify-between` with minimal vertical padding, roughly one-third of current height. The "Best value" label on the 10 ft card must remain clearly visible — do not let the badge get squeezed out.

On desktop (≥768px), keep the existing three-column card layout with taller proportions. Featured ring stays on the 10 ft card.

## 2. Hero accent gradient — bias more orange

The gradient on "brighter price" starts in gold (#FFC02E), causing the first letters to wash out against the peach hero background.

Change in `src/styles.css`:
- Add a new `--gradient-text` variable: `linear-gradient(135deg, var(--sun) 0%, var(--ember) 100%)`
- Add a `@utility text-gradient-accent` using that variable
- In `src/routes/index.tsx`, change the hero span class from `text-gradient-sun` to `text-gradient-accent`

Leave `--gradient-sun` untouched since it is used by the decorative orbs.

Important: the trailing period after "brighter price" must still inherit the gradient treatment. Wrap the span so the period is inside it.

## 3. Pricing subhead copy change

In `PricingTeaser()`:
- Old: "The more sheet you buy, the lower the per-square-foot rate."
- New: "The bigger the sheet, the lower the rate."

## 4. Closing headline copy change

In `ClosingCTA()`:
- Old: "Ready to see your art on a shirt this week?"
- New: "Ready to see your art on a shirt?"

## 5. Footer wordmark — add space

In `SiteFooter.tsx`, the wordmark currently renders as "BrightTransfers" because the text is split across elements with no space.

Change to render "Bright Transfers" (with a space), keeping the gradient accent on "Transfers".

## Verify
- Build green.
- Capture mobile (390×844) screenshots for Claude review.