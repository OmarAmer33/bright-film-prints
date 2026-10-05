# Fix duplicate error reporting in __root.tsx ErrorComponent

## Background

The previous fix to `src/routes/__root.tsx` (ErrorComponentProps typing, Error normalization, `.preload` expando) is approved and stands. One defect remains:

Line 41 recreates the normalized error on every render when `error` is NOT an `Error` instance:

```tsx
const err = error instanceof Error ? error : new Error(String(error));
```

`new Error(String(error))` returns a new object each render, and `useEffect` compares deps with `Object.is` — so the `[err]` dependency never matches and `reportLovableError` fires on EVERY re-render instead of once. The component calls `useRouter()`, so it does re-render. Result: duplicate error reports in exactly the non-Error case the fix was written to handle.

## Change — one file: `src/routes/__root.tsx`

1. Line 11: add `useMemo` to the existing React import (currently `useEffect` and `type ReactNode`):

```tsx
import { useEffect, useMemo, type ReactNode } from "react";
```

2. Line 41: memoize the normalization so `err` is referentially stable, keyed on `error`:

```tsx
const err = useMemo(
  () => (error instanceof Error ? error : new Error(String(error))),
  [error],
);
```

3. The `useEffect` dependency array stays `[err]` — once `err` is memoized, `[err]` is correct and satisfies exhaustive-deps.

## Explicitly unchanged

- `ErrorComponentProps` typing and error normalization logic (same semantics, now memoized)
- `console.error(err)` inside the component
- `reportLovableError(err, { boundary: "tanstack_root_error_component" })` call
- `ErrorComponent.preload = async () => {}` expando
- Rendered markup, buttons, and classes
- Pre-paint reveal script, `suppressHydrationWarning`, `head()` meta (including og:image)
- No other file touched

## Verification

- Build must complete with no typecheck errors (build-errors.log shows "build OK").
- Confirm via fresh read that `err` is memoized and the import includes `useMemo`.
