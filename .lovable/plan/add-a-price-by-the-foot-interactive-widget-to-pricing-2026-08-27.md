# Add a "Price by the foot" interactive widget to /pricing

**Scope:** `src/routes/pricing.tsx` only, plus a small custom range-input style block appended to `src/styles.css`. No changes to `pricing-core.ts`, `getQuote`, `checkout.functions.ts`, the pricing page's 7-tier landmark table, or any other file.

## What it adds

A new interactive section between `<Hero />` and `<PricingTable />` in `PricingPage`. A customer drags a length slider and the price updates in 1-foot steps — including at non-anchor feet where the interpolation makes the "priced by the foot, not rounded up" point visceral. The price shown is real because it calls the same `priceForFeet` the calculator/checkout use.

## Data wiring (exact, reuses existing interpolation)

- `import { priceForFeet, type PricingRow } from "@/lib/pricing-core";`
- New local component `PriceByLength({ tiers }: { tiers: PricingRow[] })`.
- Rendered in `PricingPage` as `<PriceByLength tiers={tiers} />`, placed **after** `<Hero />` and **before** `<PricingTable tiers={tiers} lowestPerSqFt={lowestPerSqFt} />`.
- `PricingRow` is already the tier shape used on the page (and is the type `data?.tiers` rows conform to).

## `PriceByLength` component logic

- State: `const [feet, setFeet] = useState(6);` (6 is an in-between value so interpolation shows immediately).
- Live compute: `const price = priceForFeet(feet, tiers);` and `const afterRewards = price * 0.9;` (matches the table's "After 10% rewards" column).
- Render both with `.toFixed(2)`.
- Slider: a native `<input type="range" min={3} max={30} step={1} value={feet} onChange={(e) => setFeet(Number(e.target.value))} />`. Min 3 / max 30 / step 1, matching `snapToFoot`'s clamp range exactly.

No reimplementation of price lookup — `priceForFeet` is the single source of truth. Anchor feet return exact `pricing_config` prices; in-between feet interpolate, identical to what checkout charges.

## Layout & content

The section wrapper matches the page's existing rhythm: `mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16` (same as the other sections, so mobile gaps stay even at 64px and desktop at 128px).

Inside, a single card: `rounded-card border border-line bg-paper p-6 shadow-warm/40 md:p-8` (or `bg-dawn` tint to echo the "Best value" row — recommend `bg-paper` to keep the readout legible; `bg-dawn/60` is the fallback if the warm tint reads better).

Card contents, top to bottom:

1. **Eyebrow** — `font-mono text-xs uppercase tracking-[0.22em] text-ember` → `PRICE BY THE FOOT`.
2. **Heading** — `<h2 className="mt-3 text-3xl text-ink sm:text-4xl">Only pay for the length you print.</h2>` (matches the page's H2 scale).
3. **Price readout** — a large `font-mono` number with the current length:
   - Big price: `<span className="font-mono text-5xl font-bold text-ink sm:text-6xl">${price.toFixed(2)}</span>`
   - Right beside/below it, the length context: `<span className="font-mono text-base text-ink/70">for a {feet} ft sheet</span>`. Wrap the price + context in a `flex items-baseline gap-3 flex-wrap` row so they stay aligned and wrap cleanly at 390px.
4. **Rewards line** — `<p className="mt-2 font-mono text-sm text-ink/70">${afterRewards.toFixed(2)} after 10% rewards</p>`.
5. **Slider block**:
   - A visible `<label htmlFor="price-by-length" className="font-mono text-xs uppercase tracking-wide text-stone">Sheet length — {feet} ft</label>` (the value is echoed in the label text so screen readers announce it, and the readout itself is aria-live).
   - `<input id="price-by-length" type="range" ... className="bt-range w-full" aria-valuemin={3} aria-valuemax={30} aria-valuenow={feet} />`.
   - End labels row: `<div className="mt-2 flex justify-between font-mono text-xs text-stone"><span>3 ft</span><span>30 ft</span></div>`.
6. **Value line** — `<p className="mt-5 text-ink/70">Priced by the foot — no jumping to the next size up. You only pay for what you use.</p>`.
7. **CTA** — `<Link to="/upload" className="mt-4 inline-flex items-center rounded-pill bg-ink px-6 py-3 text-sm font-bold text-paper">Start your sheet →</Link>` (ink pill, same convention as the rest of the site).

The big price readout gets an `aria-live="polite"` wrapper (e.g. a `<div aria-live="polite" aria-atomic="true">` around the price + context + rewards line) so the announced value updates as the slider moves. The native range input is keyboard-operable (arrow keys / Home / End) out of the box — no custom JS needed.

## Slider styling approach (styles.css only)

Append a `.bt-range` style block to `src/styles.css` (after the existing `prefers-reduced-motion` block, at the end of the file). Brand-accented track and thumb using the existing ember/sun tokens. Cross-browser via the three vendor pseudo-elements:

```css
.bt-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: var(--line);
  cursor: pointer;
}
.bt-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--ember);
  border: 3px solid var(--paper);
  box-shadow: 0 2px 6px oklch(0.625 0.244 32 / 0.35);
  margin-top: -8px;
}
.bt-range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--ember);
  border: 3px solid var(--paper);
  box-shadow: 0 2px 6px oklch(0.625 0.244 32 / 0.35);
}
.bt-range:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--ember);
  outline-offset: 2px;
}
.bt-range:focus-visible::-moz-range-thumb {
  outline: 2px solid var(--ember);
  outline-offset: 2px;
}
```

The track uses `--line` (the page's divider color) and the thumb uses `--ember` (the brand accent used for eyebrows/CTA). A filled-track look is intentionally omitted to keep the CSS vendor-safe and dependency-free; the prominent thumb on the thin track reads clearly at both 390px and desktop.

## Motion & accessibility

- No essential animation. The price readout changes instantly on input — no transition needed. If a subtle color/transform transition were added on the thumb it would be guarded inside the existing `@media (prefers-reduced-motion: reduce)` block, but the plan adds no transition, so no guard block change is required.
- Visible `<label>` + `aria-live` readout + native keyboard range + `:focus-visible` outline (already defined globally in `styles.css` and reinforced on the thumb) → fully keyboard-operable and screen-reader friendly.
- Responsive: the readout wraps at narrow widths; the slider is full-width; tested at 390px and 1366px.

## What stays untouched

- `head()` meta block — unchanged.
- The 7-tier `<PricingTable />` landmark (desktop `<table>` + mobile cards) — unchanged, sits directly below the new widget.
- `Hero`, `HowPricingWorks`, `Callouts`, `ClosingCTA` — unchanged.
- `pricing-core.ts`, `getQuote`, `checkout.functions.ts`, `pricing.functions.ts` — no imports beyond the already-public `priceForFeet` + `PricingRow` type.

## Verification

- `tsgo` typecheck on `pricing.tsx`.
- Re-read the file to confirm: only `pricing.tsx` + `styles.css` changed; `head()` byte-identical; the 7-tier table untouched; `priceForFeet` (not a reimplemented lookup) is the price source.
- Playwright at 390px and 1366px: drag/keyboard the slider and confirm a non-anchor foot (e.g. 6 ft → $35.99, 17 ft → interpolated) matches the calculator's charge, and an anchor foot (10 ft → $54.99) returns the exact table price.
