
# Plan: Bright Transfers — Step 1 (Prompt 13.1), revised

Same scope as before (design tokens + typography + brand primitives + Home), with Claude's five adjustments folded in.

## What gets built

### 1. Design tokens (`src/styles.css`)
- Brand colors as `oklch()` in `:root`, mapped via `@theme inline` so `bg-sun`, `text-ink`, etc. resolve: `paper #FFFFFF`, `dawn #FFF7EC`, `gold #FFC02E`, `sun #FF7A00`, `ember #F5351B`, `ink #1C1410`, `stone #8A7F75`, `line #EFE6DA`.
- **Fidelity check (Claude #5a):** after converting, render a hidden swatch row against the source hex values in dev and eyeball the saturated oranges (gold/sun/ember). If oklch rounding shifts them, nudge chroma/hue until the visual match is exact before moving on.
- `--gradient-sun: linear-gradient(135deg, var(--gold), var(--sun) 52%, var(--ember))`.
- Radii: pill `999px`, card `18px`, soft `12px`. Warm-tinted shadow tokens (amber-tinted, not gray).
- Remap shadcn semantic tokens (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, etc.) onto Bright Transfers so existing shadcn components inherit the brand automatically.

### 2. Typography (`src/routes/__root.tsx` head + `@theme`)
- Load via `<link>` (preconnect + Google Fonts):
  - **Bricolage Grotesque** with `opsz` axis (24..96) + weights 700/800 — **Claude #5b**, so big display headlines pick up the right optical size.
  - **Hanken Grotesk** 400–700.
  - **Space Mono** 700.
- Register `--font-display`, `--font-sans`, `--font-mono` in `@theme`. Body = Hanken; headings = Bricolage with tight tracking and `font-variation-settings: "opsz" 96` on hero-scale text.

### 3. Brand primitives (`src/components/brand/`)
- **`PriceTicker`** — Space Mono numerals, pulsing live dot (respects `prefers-reduced-motion`), props `size`, `price`, `perSqFt`. Reused in Upload/Cart later.
- **`GradientButton`** — sun gradient with warm shadow.
  - **Accessibility (Claude #4):** default label color = `ink` (#1C1410), not white — solves the WCAG AA failure white-on-orange (#FF7A00 ≈ 2.6:1) would cause across the gradient's lighter zone. Ink-on-gradient passes AA cleanly end-to-end. Visible focus ring in `ember`. Disabled state derived from `dawn`.
- **`TrustRow`** — icon + label row.
- **`SiteHeader`** (new): uses the **interim logo PNG** at ~42px (Claude #2). I'll upload `Bright_Transfers_logo_v1_restored.png` via `lovable-assets` and reference it through the `.asset.json` pointer so the hi-res swap later is a one-file change. If the file isn't already in the project I'll ask you to drop it in `/mnt/user-uploads/` first.

### 4. Route stubs (Claude #1)
Create minimal `createFileRoute` files so hero CTAs and nav don't 404:
- `/build`, `/upload`, `/pricing`, `/how-it-works`, `/faq`, `/about`, `/contact`
- Each stub: shared header + a centered "Coming soon" panel in dawn tint with a back-to-home link. Each gets its own `head()` title/description (no shared metadata).

### 5. Home page (`src/routes/index.tsx`)
- **Hero**: eyebrow "DTF Gang Sheets" · display headline (Bricolage opsz) with **one** accent word in the sun gradient · subhead · two CTAs (`Build a gang sheet` gradient → `/build`; `Upload your own` outline → `/upload`) · `PriceTicker` showing `3 ft · $19.99 · $3.63/sq ft` · faint sun-gradient orb behind hero (reduced-motion safe).
- **Trust row**: hot-peel film · vivid 5-color · free shipping over $75 · pressed & shipped fast.
- **How-it-works teaser**: 3 numbered steps.
- **Pricing teaser**: 3 sample sizes from the locked table with per-sq-ft framing → links to `/pricing` stub.
- **Closing CTA band (Claude #3, revised)**: **dawn (#FFF7EC) tint background**, ink headline + supporting copy, and a **single** `GradientButton` CTA. No full-gradient band. Keeps the gradient rare so the hero retains impact.

Mobile-first. Visible keyboard focus everywhere. `prefers-reduced-motion` honored on the orb and the ticker dot.

### 6. Home metadata
`head()`: title "Bright Transfers — DTF Gang Sheets, Printed Fast", description, og:title/description. (Full SEO + JSON-LD lives in 13.8.)

## Out of scope (later prompts)
Lovable Cloud / Supabase (13.2), real Upload/Build/Cart/Stripe/Loyalty/Admin/AI/SEO logic, real photography, hi-res logo swap.

## Verification before I hand back
- Build green; preview health healthy.
- Mobile screenshot (390×844) + desktop screenshot (1366×768) of `/`.
- Quick contrast check note on the gradient button label.

Approve and I'll build.
