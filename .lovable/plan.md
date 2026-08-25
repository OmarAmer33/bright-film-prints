# Fix /pricing mobile vertical gaps (scope: src/routes/pricing.tsx ONLY)

## Diagnosis (measured against live render at 390px)

Section bounding boxes show the visual gap between adjacent sections (= prev `pb` + next `pt`) is uneven:

| Gap | Before | px |
|-----|--------|----|
| Hero → PricingTable | pb-12 + pt-16 | 112px |
| PricingTable → HowPricingWorks | py-16 + py-16 | 128px (doubled) |
| HowPricingWorks → Callouts | py-16 + py-4 | 80px (cramped) |
| Callouts → ClosingCTA | py-4 + py-20 | 96px |

Two problems confirmed:
1. **Doubled gaps** where two big-padding sections meet (128px).
2. **Inconsistent rhythm** — Callouts at `py-4` is far tighter than its neighbors, so spacing alternates cramped/cavernous.

**Redundant nested frame (confirmed via computed styles):** on mobile the `<table>` is `display:none` and the mobile `<ul>` cards each render their own `1px solid` border + `rounded-18px` + `bg-paper`. The wrapper `<div>` ALSO renders `1px solid` border + `8px` padding + `bg-paper` + `rounded-18px` — so on mobile you see a bordered box of bordered cards. The wrapper frame only makes sense around the desktop table.

## Scope & guarantees

- Touch **only** `src/routes/pricing.tsx`.
- **Zero content/data change**: no change to `FALLBACK_TIERS`, the loader, `getPricing`, `head()`, the Sunburst, any table/card markup text, the "Every sheet is 22 inches wide" note, or any pricing math.
- Only `py`/padding tokens on section wrappers and the responsive framing of the table wrapper change.

## Fix 1 — Single consistent vertical rhythm

Apply one mobile value and one md value to every section: **`py-8` (32px) on mobile, `md:py-16` (64px) at md+**. Adjacent sections then meet at a uniform **64px on mobile / 128px at md** — even, not doubled. Hero keeps a touch more top breathing room via a dedicated `pt` (kept tighter than today, but not flat).

Exact before → after per section (only the `py`/`pt`/`pb` tokens change; `px`, `max-w`, `mx-auto`, `text-center`, `flex`, `items-center`, `relative`, `overflow-hidden`, `bg-dawn`, etc. are preserved byte-for-byte):

1. **Hero** inner div
   - before: `mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24 md:pb-16 md:pt-28`
   - after:  `mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 md:py-16`
   - (mobile: pt-12/48px top, pb-8/32px bottom → gap to next = 32+32=64px. md: uniform 64px.)

2. **PricingTable** section
   - before: `mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20`
   - after:  `mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16`

3. **HowPricingWorks** section
   - before: `mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24`
   - after:  `mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16`

4. **Callouts** section
   - before: `mx-auto max-w-6xl px-4 py-4 sm:px-6 md:py-8`
   - after:  `mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16`

5. **ClosingCTA** inner div
   - before: `mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28`
   - after:  `mx-auto flex max-w-4xl flex-col items-center px-4 py-8 text-center sm:px-6 md:py-16`

Resulting mobile gaps: 64 / 64 / 64 / 64 (uniform). Resulting md gaps: 128 / 128 / 128 / 128 (uniform, roomier).

## Fix 2 — Table wrapper frame at md+ only

The wrapper `<div>` that holds the table/cards currently frames both layouts. Make its border/padding/bg/shadow appear **only at md+**, so on mobile the price cards stand alone (no nested box) while the desktop table stays framed.

- before: `rounded-card border border-line bg-paper p-2 shadow-warm/40 sm:p-4`
- after:  `md:rounded-card md:border md:border-line md:bg-paper md:p-4 md:shadow-warm/40`

On mobile the wrapper is now borderless/transparent/padding-less — the `<ul>` cards (own borders) render directly. At md+, the wrapper regains `rounded-card border border-line bg-paper p-4 shadow-warm/40` and the (now visible) `<table>` is framed exactly as today.

**Desktop table framing preserved**: at md+ the wrapper + table are visually identical to the current desktop render (same border, same `p-4`, same `bg-paper`, same `shadow-warm/40`, same `rounded-card`). The `<table className="hidden w-full border-collapse md:table">` and all its cells are untouched.

## What does NOT change

- `head()` meta block — untouched.
- `loader`, `getPricing` import, `PricingPayload`, `FALLBACK_TIERS`, `lowestPerSqFt`, `afterRewards` math — untouched.
- `<Sunburst>` className/props — untouched.
- All table `<thead>`/`<tbody>`/cells, all mobile `<ul>`/`<li>` card markup, the "Every sheet is 22 inches wide" note, `BestValuePill`, `HowPricingWorks` cards, `Callouts` cards, `ClosingCTA` text/button/`Link` — untouched.
- No other route, no shared component, no server code, no styles.css.

## Verification

- `tsgo` typecheck on `pricing.tsx`.
- Re-read `pricing.tsx` to confirm `head()` byte-identical and only the listed `py`/wrapper tokens changed.
- Playwright screenshots: mobile 390px (full page) and desktop 1366px (full page) after the change, confirming uniform gaps and a framed desktop table.
