# Bump content-page sunburst opacity

Increase ONLY the `opacity-[...]` token on the single header `<Sunburst>` in each of the five content pages. Nothing else changes — no position, size, blur, rotate, float, footer corona, homepage coronas, the `Sunburst` component, `styles.css`, or any other file.

## Changes (one token per file)

| File | Current | New |
|---|---|---|
| src/routes/how-it-works.tsx (line 60) | `opacity-[0.07]` | `opacity-[0.11]` |
| src/routes/about.tsx (line 30) | `opacity-[0.07]` | `opacity-[0.11]` |
| src/routes/faq.tsx (line 91) | `opacity-[0.06]` | `opacity-[0.10]` |
| src/routes/contact.tsx (line 33) | `opacity-[0.06]` | `opacity-[0.10]` |
| src/routes/pricing.tsx (line 71) | `opacity-[0.09]` | `opacity-[0.11]` |

Each is a single-token string replacement inside the existing `className`. Verified current values against the source before planning.

## Out of scope (untouched)

- Footer corona (`SiteFooter.tsx`, `opacity-[0.05]`)
- Homepage coronas (`index.tsx` — 0.16 / 0.10 / 0.08)
- `Sunburst.tsx` component
- `src/styles.css` and the `bt-sunburst` utility
- All other attributes on each `<Sunburst>` (position, size, blur, rotate, float)

## Verification

- Screenshot each of the five pages at 390 and 1366 px to confirm the corona reads slightly stronger and no horizontal overflow appears.
- Confirm `document.documentElement.scrollWidth === clientWidth` on each page.
