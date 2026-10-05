# Swap header logo to the vector SVG

## Verified about the file
- `bright-transfers-logo-no-outline.svg`, 34 KB, viewBox `112 44 839 859` (close to square, 0.98:1).
- True vector: 5 `<path>` elements, no `<image>` tags, nothing raster embedded.
- Five flat fills: #040303, #E7B82F, #EE5B29, #F9D836, #FBFBF9. The near-white path is the teeth and eye highlights. The outer sticker ring was removed on purpose.

## Edits
1. **New asset pointer**: `lovable-assets create --file /mnt/user-uploads/bright-transfers-logo-no-outline.svg --filename bright-transfers-logo.svg > src/assets/bright-transfers-logo.svg.asset.json`.
   - Referenced through the asset pointer, not a direct import. That matches the current pattern. An `<img src>` SVG renders fine from the CDN; only `<use href>` is affected by attachment disposition, and we don't use that here.
2. **src/components/brand/SiteHeader.tsx**: change only the import on line 6 to `@/assets/bright-transfers-logo.svg.asset.json`. The `<img>` keeps the same classes (`h-10 w-10 object-contain`) and the same `alt`/`aria-hidden`.
3. The old PNG pointer stays as it is (no CDN delete), so it's easy to roll back.

## Favicon
- Skipped for this change. It will be its own change after the header swap is verified on the published site. No `public/` folder is created and `__root.tsx` is not touched.

## Verification
- Playwright element screenshots of the header logo at 390 and 1366 widths, checking sharpness.
- Clean build log.

## Out of scope
`__root.tsx`, favicon, all server, pricing, upload, checkout and admin code, `styles.css`, and dependencies.
