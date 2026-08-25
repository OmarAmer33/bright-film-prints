# Build out the Pricing page (/pricing)

Replace ONLY `src/routes/pricing.tsx`. Preserve its existing `head()` meta block byte-for-byte. Do not modify `getPricing`, any server code, any shared component, or any other route.

## Route config

- Keep the existing `head()` unchanged.
- Add a `loader` mirroring `index.tsx`:
  - `import { getPricing, type PricingPayload } from "@/lib/pricing.functions";`
  - `loader: async (): Promise<PricingPayload | null> => { try { return await getPricing(); } catch (e) { console.error("[pricing loader]", e); return null; } }`
- Replace the `component` with a real `PricingPage` component.

## Data wiring (exact)

- `FALLBACK_TIERS` at top of file (7 tiers: 3, 5, 7, 10, 15, 20, 30 ft) per the spec.
- In component: `const data = Route.useLoaderData();`
- `const tiers = data?.tiers ?? FALLBACK_TIERS;`
- `const freeShip = data?.settings?.free_ship_threshold ?? 75;`
- Per tier: `afterRewards = price * 0.9` (10% rewards, locked). Format as `$${afterRewards.toFixed(2)}`.
- Best-value tier: the row with the **lowest `per_sqft`** — compute with `Math.min(...tiers.map(t => t.per_sqft))` and find the matching tier. Do not hardcode the index.
- All prices/numbers rendered in `font-mono` (Space Mono).

## Page shell & conventions (match index.tsx + content pages)

- Shell: `<div className="min-h-screen bg-paper text-ink flex flex-col"><SiteHeader /><main className="flex-1">…</main><SiteFooter /></div>`
- Import `SiteHeader` from `@/components/brand/SiteHeader` and `SiteFooter` from `@/components/brand/SiteFooter`.
- Import `Link` from `@tanstack/react-router`.
- Eyebrow: `font-mono text-xs uppercase tracking-[0.22em] text-ember`.
- H1: `text-4xl text-ink sm:text-5xl`; H2: `text-3xl text-ink sm:text-4xl`.
- Body: `text-ink/70`.
- Cards: `rounded-card border border-line bg-paper p-6 shadow-warm/40`.
- CTA ink pill: `inline-flex items-center rounded-pill bg-ink px-6 py-3 text-sm font-bold text-paper`.
- Narrative sections: `mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24`.
- Table/cards section: `mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24`.

## Sections

1. **Hero** — eyebrow "Pricing"; H1 "Pay by the square foot."; subhead (the spec text). Subhead in `max-w-2xl text-lg text-ink/70 sm:text-xl` to match index hero.

2. **Pricing table (centerpiece)** — `mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24`:
   - Desktop (md+): real `<table>` with columns "Sheet size" | "Price" | "Per sq ft" | "After 10% rewards". One row per tier. `font-mono` prices. Comfortable row height (`py-4`), `border-t border-line` dividers. Header row: `font-mono text-xs uppercase tracking-wide text-stone`. Best-value row: `bg-dawn/60` and a pill `rounded-pill bg-ink px-2 py-0.5 text-[10px] font-mono uppercase text-paper` ("Best value") inside the size cell.
   - Mobile (below md): stacked cards — each card shows `size_ft` prominently (`font-display`), price large (`font-mono text-2xl`), then two small labeled lines: "per sq ft" and "after 10% rewards". Best-value card: same pill + `bg-dawn/60`.
   - Use responsive toggle: render the table with `hidden md:table` (or a `md:block`/`md:hidden` pair) and the card list with `md:hidden`.
   - Near the table: a note "Every sheet is 22 inches wide" (small, `text-stone`).

3. **"How our pricing works"** — 3 small cards (`md:grid-cols-3`), titles: "22-inch-wide film", "Sold by the linear foot", "Bigger = cheaper", each with one-line body.

4. **Two callout cards** (`md:grid-cols-2`):
   - "Free shipping over $X" (X = freeShip) — subtext "Flat $6.99 on everything under that."
   - "Earn 10% back" — subtext "Rewards on every order, once you have an account — spend them on your next one."

5. **CTA band** (`bg-dawn`): H2 "Ready to print?"; body line (spec text); ink-pill CTA "Start your sheet" → `/upload` via `<Link>`.

## Verification

- `tsgo` typecheck on `pricing.tsx`.
- Re-read the file to confirm `head()` untouched and no imports of `getPricing` internals or server code beyond the public `getPricing` fn + `PricingPayload` type.
- Confirm `pricing.tsx` is the only changed file.
