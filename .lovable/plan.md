# Swap header logo to the vector SVG

## Verified about the file
- `bright-transfers-logo-no-outline.svg`, 34 KB, viewBox `112 44 839 859` (close to square, 0.98:1).
- True vector: 5 `<path>` elements, no `<image>` tags, nothing raster embedded.
- Five flat fills: #040303, #E7B82F, #EE5B29, #F9D836, #FBFBF9. The near-white (#FBFBF9) path sits on a white header, so it blends in. That is fine if it's meant as an inner highlight. Check it in the screenshot.

## Edits
1. **New asset pointer**: `lovable-assets create --file /mnt/user-uploads/bright-transfers-logo-no-outline.svg --filename bright-transfers-logo.svg > src/assets/bright-transfers-logo.svg.asset.json`.
   - Referenced through the asset pointer, not a direct import. That matches the current pattern. An `<img src>` SVG renders fine from the CDN; only `<use href>` is affected by attachment disposition, and we don't use that here.
2. **src/components/brand/SiteHeader.tsx**: change only the import on line 6 to `@/assets/bright-transfers-logo.svg.asset.json`. The `<img>` keeps the same classes (`h-10 w-10 object-contain`) and the same `alt`/`aria-hidden`.
3. The old PNG pointer stays as it is (no CDN delete), so it's easy to roll back.

## Favicon
- There's no `public/` folder and no `rel="icon"` link in `__root.tsx` today.
- Proposal: copy the SVG unchanged to `public/favicon.svg` and add `{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }` to the root `head().links`. This is one extra small edit in `__root.tsx`. If you want the header-only scope kept strict, skip this part.

## Verification
- Playwright element screenshots of the header logo at 390 and 1366 widths, checking sharpness and that the near-white area looks right.
- Clean build log.

## Out of scope
All server, pricing, upload, checkout and admin code, `styles.css`, and dependencies.
