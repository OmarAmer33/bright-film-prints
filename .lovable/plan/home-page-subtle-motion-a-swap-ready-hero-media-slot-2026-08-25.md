# Home page: subtle motion + a swap-ready hero media slot

Two independent parts, both scoped to `src/routes/index.tsx`, `src/styles.css`, and one small new component. No new dependencies — motion uses the already-installed `tw-animate-css` plus a tiny IntersectionObserver wrapper. All new motion is disabled inside the existing `prefers-reduced-motion` block.

## Part 1 — Motion on what's already there

### Mechanism: a class-gated `Reveal` wrapper (visible without JS)

Progressive enhancement — the hidden starting state only exists for JS-enabled clients.

**1. Marker class.** A tiny inline script in the root document head (`src/routes/__root.tsx`) runs before first paint:

```html
<script>document.documentElement.classList.add('reveal-ready')</script>
```

This is the one file outside `index.tsx` / `styles.css` / the new component that gets touched — a single added `<script>` tag, nothing else in `__root.tsx` changes. (Alternative if you'd rather not touch `__root.tsx`: set the class at module load inside `Reveal.tsx`; slightly later, so a brief flash of already-visible content is possible on slow first loads. Recommendation: the head script.)

**2. CSS gating** in `src/styles.css`:

```css
.reveal-ready .bt-reveal { opacity: 0; transform: translateY(12px); }
.reveal-ready .bt-reveal[data-revealed="true"] { opacity: 1; transform: none; }
```

So the default/SSR markup carries no `opacity-0` — with JS off, `reveal-ready` is never added and every section renders fully visible immediately.

**3. `src/components/brand/Reveal.tsx`** (new):

- Renders a `div` with class `bt-reveal` and `data-revealed="false"`; holds its own space (no layout shift).
- One `IntersectionObserver` per element, `threshold: 0.15`, `rootMargin: "0px 0px -10% 0px"`, unobserves after first intersection (reveal once, never replays on scroll-up).
- On intersect: sets `data-revealed="true"` and adds `animate-in fade-in slide-in-from-bottom-3` (tw-animate-css) with duration/delay from props.
- `matchMedia("(prefers-reduced-motion: reduce)")` → reveal immediately on mount, no animation classes.
- No `IntersectionObserver` support → reveal immediately on mount.
- Props: `delay` (ms, default 0), `duration` (ms, default 500), `className`.

**Behaviour confirmation**
- JS disabled → `reveal-ready` absent → all homepage sections fully visible, no animation.
- Reduced motion → visible, no animation (CSS block below also hard-overrides).
- Normal → head script sets the class before paint, so sections start hidden without a flash of visible-then-hidden, then fade/slide in once as they enter the viewport.


### Timing / easing
- Duration: **500ms**, easing **ease-out** (`--tw-ease` via `ease-out` utility).
- Slide distance: **12px** (`slide-in-from-bottom-3`) — deliberately short.
- Stagger between siblings in a group: **90ms** (index × 90, capped at 3 items so nothing waits longer than ~270ms).

### Which sections get what

| Section | Treatment |
|---|---|
| Hero (eyebrow, headline, subhead, CTAs, PriceTicker, orbs) | **Unchanged.** No reveal — it is above the fold and must paint instantly. |
| Trust band | Single reveal, 500ms, no stagger. |
| How-it-works heading | Single reveal. |
| How-it-works 3 step cards | Reveal each, stagger 0 / 90 / 180ms. |
| Pricing teaser heading + "See full pricing" button | Single reveal for the header block. |
| Pricing teaser 3 tier cards | Reveal each, stagger 0 / 90 / 180ms. |
| Closing CTA block | Single reveal (heading, copy, button as one unit). |
| Hidden QA swatches | Untouched. |

### Hover-lift on interactive cards
Applied to the 3 how-it-works step cards and the 3 pricing tier cards:

```
transition-[transform,box-shadow] duration-200 ease-out
hover:-translate-y-0.5 hover:shadow-warm
```

- 2px lift only, matching the existing `hover:-translate-y-[1px]` language on `GradientButton`.
- Featured pricing card keeps its `shadow-glow` + ember ring and lifts the same 2px.
- Motion-reduce: the translate is dropped (shadow change stays, it is not motion).

### Reduced motion (non-negotiable)
Extend the existing block in `src/styles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .bt-animate-pulse,
  .bt-animate-float { animation: none !important; }

  /* new */
  .bt-reveal { opacity: 1 !important; animation: none !important; transform: none !important; }
  .bt-hover-lift:hover { transform: none !important; }
  .bt-media-slot video { display: none; }   /* poster/placeholder shows instead */
}
```
Plus `motion-reduce:` utility variants on the cards as a second line of defence.

## Part 2 — Hero media slot

### Layout recommendation: **two-column hero (copy left / media right at `md+`, stacked on mobile)**

Why: a full-width band below the copy would push the PriceTicker and both CTAs down on every viewport, which is exactly what you said not to do. The two-column version keeps the CTAs at the same vertical position on desktop and, on mobile, the media renders **after** the PriceTicker so the entire existing hero (headline → CTAs → ticker) is still first in the scroll. Mobile media height is capped so it acts as a teaser, not a wall.

```text
md+                                mobile
+---------------+  +----------+    eyebrow
| eyebrow       |  |          |    headline
| headline      |  |  MEDIA   |    subhead
| subhead       |  |  16:10   |    CTAs
| CTAs          |  |          |    PriceTicker
| PriceTicker   |  +----------+    MEDIA (4:3, capped)
+---------------+
```

- Grid: `md:grid-cols-[1.05fr_0.95fr]`, `gap-10 md:gap-12`, `items-center`.
- Copy column keeps every existing element byte-identical, just wrapped in the left cell. Orbs stay on the section, behind both columns.
- Media order: `order-last md:order-none` so mobile shows it beneath the ticker.

### Reserving dimensions (CLS = 0)
- The slot is an `aspect-[4/3] md:aspect-[16/10]` container with `w-full`, so the box is reserved before any media loads.
- Mobile gets `max-h-[280px]` and `mx-auto` so it never dominates the phone viewport.
- Any future `<img>`/`<video>` is `absolute inset-0 h-full w-full object-cover` inside that box — swapping media cannot change layout.

### Placeholder treatment (branded, no stock photo, no AI fake)
Inside the reserved box:

- `rounded-card border border-line bg-dawn overflow-hidden shadow-warm` frame.
- A soft `var(--gradient-sun)` wash at low opacity plus a faint repeating-linear-gradient "film sheet" rule pattern in `line`/`stone` at ~8% — reads as a gang-sheet grid, purely tokens and CSS.
- Centered: a small mono eyebrow `PRESS ROOM`, a one-line label, and a dashed `confirm` pill matching the `ConfirmPill` pattern used on the content pages, so it is visually obvious this is staged.
- No text is essential to the pitch — removing the placeholder loses nothing.

### The single swap point
One clearly marked comment block in `index.tsx`:

```tsx
{/* CHAI-CONFIRM: HERO MEDIA SWAP POINT — replace <HeroPlaceholder /> with ONE of:
    <img src={heroPhoto} alt="…" loading="lazy" decoding="async"
         className="absolute inset-0 h-full w-full object-cover" />
  or
    <video className="absolute inset-0 h-full w-full object-cover"
           poster={heroPoster} src={heroClip}
           muted loop playsInline autoPlay preload="none" />
    Keep the wrapper's aspect ratio classes — they reserve the box and prevent CLS. */}
<HeroPlaceholder />
```

- Video guidance baked into the comment: `muted loop playsInline preload="none"` + a `poster` so nothing downloads until needed, and it is hidden entirely under reduced motion (poster shows).
- `HeroPlaceholder` is a local component inside `index.tsx` (not a shared component), so deleting it at swap time touches one file.

## Files changed
- `src/routes/index.tsx` — hero becomes two-column, adds `HeroPlaceholder` + swap comment, wraps sections in `Reveal`, adds hover-lift classes.
- `src/components/brand/Reveal.tsx` — new, ~45 lines.
- `src/styles.css` — add the `.reveal-ready` gating rules and extend the existing reduced-motion block.
- `src/routes/__root.tsx` — one added inline `<script>` in head that sets the `reveal-ready` class; nothing else changes.

Not touched: other routes, server code, pricing logic, `SiteHeader`/`SiteFooter`, `GradientButton`, `PriceTicker`, `TrustRow`.
