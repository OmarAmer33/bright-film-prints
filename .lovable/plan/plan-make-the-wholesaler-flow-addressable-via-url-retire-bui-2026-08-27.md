# Plan: Make the wholesaler flow addressable via URL; retire /build

Four files change: `src/components/brand/GradientButton.tsx`, `src/routes/upload.tsx`, `src/routes/build.tsx`, `src/routes/index.tsx`. Plus `src/routeTree.gen.ts` regenerates automatically. No new upload flow is built — the existing `WholesalerFlow` in `upload.tsx` becomes directly linkable.

## 1) `src/components/brand/GradientButton.tsx` — forward `search` on links

- Add `search?: LinkProps["search"]` to the `AsLink` type.
- Forward it in the `Link` render:
  ```tsx
  <Link to={(props as AsLink).to} search={(props as AsLink).search} className={cls}>
  ```
- Styling, variants, sizes, and the button/anchor branches untouched.

## 2) `src/routes/upload.tsx` — URL-addressable mode

### (a) `validateSearch` typing

Plain validator, no schema library (this route doesn't use zod elsewhere for search):

```tsx
validateSearch: (search: Record<string, unknown>): { mode?: "wholesaler" } => ({
  mode: search.mode === "wholesaler" ? "wholesaler" : undefined,
}),
```

Only the exact string `"wholesaler"` survives; `"diy"`, junk, or absent all yield `undefined`, so a bare `/upload` URL stays clean. The string `"wholesaler"` is reused verbatim — it is already the wire value for `getQuote`'s `mode` argument and the cart item's `kind`, so no mapping layer is introduced and the data layer is untouched.

### (b) How UploadFlow reads the search param

`UploadFlow` is a child component in the same route file, so it calls the route's typed hook directly:

```tsx
function UploadFlow({ pricing }: { pricing: PricingPayload | null }) {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"diy" | "wholesaler">(
    search.mode === "wholesaler" ? "wholesaler" : "diy"
  );
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const navigate = useNavigate({ from: "/upload" });
  ...
```

The search param is read **once, as the `useState` initializer only**. The rendered `mode` stays driven by `useState` — no `useEffect`, no subscription syncing search back into state. No `key` props added anywhere. `upload` state stays in `UploadFlow`; `<DropZone>` stays rendered above the `mode === "diy" ? ... : ...` ternary. Component tree otherwise unchanged.

### Toggle click writes the URL back

```tsx
onClick={() => {
  setMode(m);
  void navigate({
    search: { mode: m === "wholesaler" ? "wholesaler" : undefined },
    replace: true,
  });
}}
```

### (c) Remount analysis — does `upload` state survive the toggle?

**It survives. `navigate({ replace: true })` re-renders; it does NOT remount.** TanStack Router matches `/upload` to the same route match before and after a search-only navigation — the route id and path are unchanged, so React reconciles against the same component instance at the same position in the tree. `UploadFlow`'s hooks (`useState` for `mode` and `upload`) keep their state across the re-render. The only observable change is `Route.useSearch()` returning the new value, which is never fed back into state (search seeds the initializer only). With `replace: true`, no history entry is added, so Back doesn't step through mode flips. Remount would only occur if the route id changed or a `key` changed — neither happens here, and I am not adding either. I do not believe a remount occurs, so no stop condition is triggered.

### UI text and head() only

- Toggle labels: `"DIY art"` → `"My artwork"`; `"Wholesaler sheet"` → `"My gang sheet"`.
- Intro paragraph (~lines 69–71) rewritten in plain language covering both paths, no "wholesaler":
  "Drop a single piece of artwork, pick a size and quantity — or upload a finished 22\"-wide gang sheet and price it by length."
- `head()` broadened:
  - title / og:title: `"Upload artwork or a gang sheet — Bright Transfers"`
  - description: `"Upload a print-ready PNG, JPG, or PDF — a single design or a finished 22\"-wide gang sheet — and see your DTF price in real time."`
  - og:description: `"Upload art or a finished gang sheet, and price DTF prints in seconds."`

Explicitly NOT touched: `getQuote`'s `mode` argument, cart `kind: "wholesaler"`, `computeWholesalerSheet`, `priceBreakdown`, length/DPI suggestion logic, `DropZone`, add-to-cart path.

## 3) `src/routes/build.tsx` — redirect-only

Replace the whole file with:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/build")({
  beforeLoad: () => {
    throw redirect({ to: "/upload", search: { mode: "wholesaler" } });
  },
});
```

Component, `head()`, and the `ComingSoon` import are removed from this file. `src/components/brand/ComingSoon.tsx` itself is NOT deleted or modified — `tools.upscale.tsx` still uses it. The `/build` path still resolves (no 404 for bookmarks/demo links).

## 4) `src/routes/index.tsx` — hero CTA fork (~lines 102–107)

- Primary: `to="/upload" search={{ mode: "wholesaler" }}`, label `"Upload your gang sheet →"`. No longer points at `/build`.
- Secondary outline: keep `to="/upload"` with no search; relabel to `"Upload your artwork"`.
- Closing CTA (~line 318, "Start your order →") untouched.

## Do not touch

`src/lib/pricing-core.ts`, all `*.functions.ts` / `*.server.ts`, checkout, cart, admin, `styles.css`, `SiteHeader.tsx`, `SiteFooter.tsx`, `how-it-works.tsx`, other routes. `src/routeTree.gen.ts` regenerates as expected.

## Verification (after approval)

1. Typecheck passes.
2. `/build` redirects to `/upload?mode=wholesaler` and renders the "My gang sheet" flow.
3. `/upload` (bare) renders "My artwork" (diy) by default.
4. Toggling modes updates the URL instantly with `replace: true`, and an uploaded file survives the toggle (DropZone state intact).
5. Home hero buttons land on the correct modes.
6. Add-to-cart from both modes still quotes and charges correctly (spot-check via Playwright).
