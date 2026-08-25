# Sitewide sunburst rollout (component extraction)

Extract the homepage corona into one reusable component and place a single, fainter corona on each content page header plus the shared footer. No new dependencies, no assets, no `styles.css` change — the existing `bt-sunburst` utility and the existing reduced-motion block cover everything.

## 1. New component

`src/components/brand/Sunburst.tsx` — exactly the shape you specified: `aria-hidden`, `pointer-events-none`, `absolute`, `bt-sunburst`, optional `bt-animate-float` via `float`, optional static `rotate` transform, caller-supplied `className` for position/size/opacity/blur.

## 2. Homepage refactor — output-identical

`src/routes/index.tsx`: the three inline divs are replaced by `<Sunburst>` calls carrying the identical class strings and rotate value:

| Placement | Props |
|---|---|
| Hero top-right | `float`, `className="-top-40 right-[-10%] h-[560px] w-[560px] opacity-[0.16] blur-[1px]"` |
| Hero bottom-left | `rotate={18}`, `className="-bottom-32 left-[-10%] h-[400px] w-[400px] opacity-[0.10] blur-[2px]"` |
| Closing CTA | `className="left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 opacity-[0.08] blur-[3px]"` |

Same classes, same order, same `aria-hidden`/`pointer-events-none` → rendered DOM is byte-identical. Hero and Closing CTA sections already have `relative overflow-hidden`; nothing else on the homepage changes.

## 3. Content pages — one faint upper-right corona each

All static (no float), all offset up and to the right so the ray field sits outside the H1's text column, all inside a `relative overflow-hidden` first section with the content wrapper made `relative` so text layers above.

| Page | Section | Sunburst className | Notes |
|---|---|---|---|
| how-it-works | first `<section>` | `-top-32 right-[-12%] h-[420px] w-[420px] opacity-[0.07] blur-[2px]` | rotate 10 |
| about | first `<section>` | `-top-32 right-[-12%] h-[420px] w-[420px] opacity-[0.07] blur-[2px]` | rotate -8 |
| faq | first `<section>` | `-top-28 right-[-14%] h-[380px] w-[380px] opacity-[0.06] blur-[2px]` | rotate 14 |
| contact | first `<section>` | `-top-28 right-[-14%] h-[380px] w-[380px] opacity-[0.06] blur-[2px]` | rotate -14 |
| pricing | existing `Hero()` | replaces the current plain blurred orb: `-top-40 right-[-10%] h-[460px] w-[460px] opacity-[0.09] blur-[2px]` | keeps existing `float`; net element count unchanged |

Every value is at or below the homepage hero's 0.16 — content pages read fainter by design. Pricing sits slightly higher (0.09) only because it replaces an existing 0.20-opacity orb, so it is still a net reduction in visual weight.

Negative right offsets combined with the parent's `overflow-hidden` mean no horizontal scroll; the coronas are absolutely positioned so no layout shift.

## 4. Shared footer

`src/components/brand/SiteFooter.tsx`: `<footer>` gets `relative overflow-hidden`, inner container gets `relative`. One static corona:

`-bottom-40 right-[-8%] h-[420px] w-[420px] opacity-[0.05] blur-[3px]`

0.05 is the faintest value in the system — the footer is `bg-dawn/40`, so the corona reads as a warm tint rather than a graphic, and footer link text (`text-ink/70`) contrast is unaffected.

## 5. Exclusions

No header corona is added to: `upload`, `build`, `cart`, checkout, `account`, `orders.$token`, `admin`, `admin_.orders.$id`, `tools.upscale`. Those files are not edited at all. They inherit only the shared footer corona at the very bottom — intended.

`SiteHeader`, all server code, pricing logic, and the `bt-sunburst` utility are untouched.

## Motion

Only the homepage hero and the pricing hero use `bt-animate-float`, both pre-existing; the existing `prefers-reduced-motion` block already disables it. No new animation is introduced.

## Verification after build

- Screenshot each of the 5 content pages plus the footer at 390 and 1366 px.
- Confirm `document.documentElement.scrollWidth === clientWidth` (no horizontal overflow) on every page.
- Confirm homepage DOM for the three coronas matches the pre-refactor markup.
