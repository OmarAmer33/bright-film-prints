# Home page: whisper-faint sunburst motif

Echo the logo's spiky sun corona in two places only, using existing brand tokens. No new files, no assets, no dependencies.

## Technique

`repeating-conic-gradient` for the rays, softened by a radial mask.

- A single decorative `<div>` with two stacked background layers:
  1. `repeating-conic-gradient(from -12deg, var(--sun) 0deg 3deg, transparent 3deg 15deg)` — 24 wedge rays, matching the corona's spiky rhythm.
  2. `radial-gradient` in `--gradient-sun` colors underneath, so the ray field sits inside a warm glow rather than a hard disc.
- Radial mask so rays fade out before their edges — no visible circular boundary, no hard geometry. Both prefixes are required; iOS Safari (WebKit) ignores unprefixed `mask-image`, which would render the conic rays with a hard circular edge on the exact device this gets tested on. The prefixed version comes first:
  ```css
  -webkit-mask-image: radial-gradient(closest-side, black 0%, black 38%, transparent 72%);
  mask-image:         radial-gradient(closest-side, black 0%, black 38%, transparent 72%);
  ```
- Light `blur` (8–14px) to keep the rays as a suggestion rather than a graphic.

Why not the alternatives: inline SVG would need hand-authored path geometry and its own gradient defs (more markup, no gain at this opacity); `repeating-linear-gradient` produces parallel stripes, not radiating rays. `repeating-conic-gradient` is one CSS declaration, resolution-independent, and reads correctly as a corona.

## Placement 1 — Hero (replaces the two orbs)

The two existing plain blurred circles are replaced, not supplemented — net element count stays at two.

- Top-right element: sunburst, ~560px, `opacity: 0.14`, blur ~10px, keeps the existing `bt-animate-float`.
- Bottom-left element: sunburst, ~400px, `opacity: 0.08`, blur ~14px, static (no float), rotated ~18deg via a static `transform` so the ray phase differs from the top-right one.
- Both keep the current absolute offsets, `aria-hidden`, `pointer-events-none`, and live inside the hero's `overflow-hidden` section — so no layout shift and no horizontal scroll.
- No spin: the only motion is the existing gentle vertical float, already disabled under reduced motion.

## Placement 2 — Recommended: glow behind the closing CTA

Recommend (a), the soft sunburst behind the "Ready to see your art on a shirt?" section.

Why over the ray divider: the closing CTA is already a `bg-dawn` band with a single gradient element (the button), so a faint corona behind the headline reinforces the brand at the moment of conversion without adding a new visual element to the page rhythm. A ray divider would introduce texture into a horizontal rule that currently does structural work — it would read as noise, not brand, and it sits between two content blocks where the eye is only passing through.

- One centered, `aria-hidden`, `pointer-events-none` element behind the copy, ~720px, `opacity: 0.07`, blur ~18px, **static**.
- Section gets `relative overflow-hidden`; content wrapper gets `relative` so text stays above and contrast is untouched (0.07 sun over dawn is well below any measurable contrast impact on `text-ink`).

The `border-y` divider on the pricing teaser stays exactly as-is.

## Reduced motion

No new animation is introduced, so the existing `@media (prefers-reduced-motion: reduce)` block already covers everything (it disables `bt-animate-float`). If a `styles.css` change is needed at all, it is only to add a `bt-sunburst` utility holding the conic + mask declarations; that rule is static and needs no motion guard.

## Files touched

- `src/routes/index.tsx` — swap the two hero orb divs for sunburst divs; add one decorative div plus `relative overflow-hidden` to `ClosingCTA`.
- `src/styles.css` — optional `@utility bt-sunburst` for the shared conic/mask background (keeps index.tsx inline styles short). Its mask declaration uses both `-webkit-mask-image` (first) and `mask-image` with identical values; any inline `mask-image` in index.tsx follows the same doubled-prefix form.

Nothing else changes: hero grid, media slot, copy, CTAs, header, footer, and all other routes are untouched.
