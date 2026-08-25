# Fill four content-page stubs with meeting-draft content

Replace ONLY the `component` in each of these four routes with real page content:
- `src/routes/how-it-works.tsx`
- `src/routes/about.tsx`
- `src/routes/faq.tsx`
- `src/routes/contact.tsx`

## Invariants (no changes outside these 4 files)

- Preserve each route's existing `head()` meta block byte-for-byte.
- Do NOT touch `pricing.tsx`, any shared component, any server code, or routing.
- No new shared component files. The CHAI-CONFIRM pill is a small local component defined in each route file (so no shared component is added or edited).
- Page shell matches index.tsx / ComingSoon.tsx: `<SiteHeader />` ... `<SiteFooter />` wrapped in `<div className="min-h-screen bg-paper text-ink flex flex-col">`.

## CHAI-CONFIRM pill

A small inline component, local to each route file:

```tsx
function ConfirmPill() {
  return (
    <span className="inline-flex items-center rounded-pill border border-dashed border-stone/50 bg-dawn px-2 py-0.5 align-middle text-[11px] font-mono uppercase tracking-wide text-stone">
      confirm
    </span>
  );
}
```

Dashed border + stone text reads clearly as "placeholder / to be confirmed". Used inline wherever the spec marks `[confirm-pill]`.

## Shared conventions (from index.tsx)

- Eyebrow: `<p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">…</p>`
- H1: `text-4xl text-ink sm:text-5xl`; H2: `text-3xl text-ink sm:text-4xl`
- Body: `text-ink/70`
- Narrative sections: `mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24`
- Card grids: `mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24`
- Cards: `rounded-card border border-line bg-paper p-6 shadow-warm/40`
- CTA "ink pill" link: `inline-flex items-center rounded-pill bg-ink px-6 py-3 text-sm font-bold text-paper` (matches header "Start order" pill)
- CTA outline link: `text-ink border border-ink/15 hover:border-ink/40 hover:bg-dawn`

## Per-page content

### /how-it-works
- Eyebrow "How it works". H1 "From your file to your door."
- Intro paragraph.
- 4 numbered step cards (`md:grid-cols-2`), each with `font-mono` number, h3 title, body.
- Two info lines below cards: press-temp line (link to `/faq`) with ConfirmPill; free-shipping line.
- CTA ink pill "Start your sheet" → `/upload`.

### /about
- Eyebrow "About". H1 "Built by printers, for printers."
- Top draft callout box: `rounded-card border border-line bg-dawn p-4 text-sm text-ink/70` "Draft brand story — to confirm and personalize with Chai."
- 3 body paragraphs (draft story).
- 3 value cards grid (`md:grid-cols-3`).
- CTA link "See how it works" → `/how-it-works`.

### /faq
- Eyebrow "FAQ". H1 "Questions, answered."
- Q/A list: each item is a div with question (`font-medium text-ink`) + answer (`text-ink/70`), separated by `border-t border-line`.
- ConfirmPills where spec marks `[confirm-pill]`.
- CTA link "Still stuck? Contact us" → `/contact`.

### /contact
- Eyebrow "Contact". H1 "Get in touch."
- Intro paragraph.
- Info card grid (`md:grid-cols-2`): Email (mailto placeholder, ConfirmPill), Phone (ConfirmPill), Location (Miramar, Florida), Hours (ConfirmPill). No form.
- HTML comment in component: `contact form deferred until channel + destination decided (CHAI-CONFIRM)`.
- CTA link "Looking for a quick answer? Read the FAQ" → `/faq`.

## Verification

- `tsgo` typecheck on the four files (no new imports beyond `Link` + brand header/footer + the local `ConfirmPill`).
- Re-read each file to confirm `head()` untouched and `pricing.tsx` / shared components unchanged.
- Report the four changed files and the confirmations.
