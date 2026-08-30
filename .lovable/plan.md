# Plan: Lazy-load pdf-lib in `readPdfDims`

**Scope:** `src/lib/image-dims.server.ts` ONLY. No other file is touched.

## Problem

Line 4 imports `pdf-lib` at module scope:

```ts
import { PDFDocument, PDFName, PDFNumber } from "pdf-lib";
```

`image-dims.server.ts` is imported by `src/routes/api/uploads.upload.ts`, so the import is evaluated on every load of the upload route — including PNG and JPEG uploads. `pdf-lib` bundles cleanly (verified in the production build) but has never been executed under workerd. If its top-level evaluation fails there, the entire upload route dies and takes the raster path down with it.

## Change

1. **Remove** the module-scope import on line 4.
2. **Inside `readPdfDims`**, as the first statement inside the existing `try` block, load pdf-lib dynamically:

```ts
const { PDFDocument, PDFName, PDFNumber } = await import("pdf-lib");
```

Everything else in `readPdfDims` stays byte-identical: the `PDFDocument.load`, the `getPage(0)` + null guard, the `getMediaBox` + null guard, the `/UserUnit` read via `page.node.get(PDFName.of("UserUnit"))`, the `instanceof PDFNumber` check, the `Number.isFinite(userUnit) || userUnit <= 0` guard, the `/Rotate` angle normalization (`((angle % 360) + 360) % 360`), the 90/270 swap, the inches conversion `(width / 72) * userUnit`, and the `catch { return null; }`.

## Why this is safe

`readPdfDims` is already `async` and already wrapped in `try/catch`. A failed dynamic import rejects, the existing catch returns `null`, and `uploads.upload.ts` stores `null` dimensions — which falls through to the manual-entry path that already exists and is already tested. The failure mode degrades to current behavior instead of a dead route. The cost is one extra dynamic import per PDF upload, which is the exact case that needs pdf-lib.

## Unchanged

- `readImageDims`, `isPng`, `isJpeg`, `readPng`, `readJpeg`, the `Dims` type, and the file header comment — all byte-identical.
- `src/routes/api/uploads.upload.ts`, `src/routes/upload.tsx`, `package.json` (pdf-lib stays a dependency), the migration, pricing, checkout, cart, DropZone, and every other file.

## Deliverable

- The single line-replace edit (remove line 4; add the dynamic import as the first statement in the `try` block).
- Confirmation that `readImageDims` and both raster parsers are unchanged.
