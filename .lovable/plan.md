Add a visibility-only admin nav link to the header, gated by a new non-throwing server function. No changes to existing `/admin` enforcement or publish.

### Files to change

1. `src/lib/admin.functions.ts` — append `getIsAdmin` below `requireAdmin`.
2. `src/components/brand/SiteHeader.tsx` — add admin-detection state and render the Admin link in desktop nav and mobile Sheet.

### Technical details

**`src/lib/admin.functions.ts`**

Add a new exported `createServerFn` named `getIsAdmin` (method: GET). It mirrors `requireAdmin`'s token extraction and claim lookup via the existing `publicClient()` helper, but never throws. On any missing token, malformed JWT, claim error, or absent `user_roles` row, return `{ isAdmin: false }`. On success, return `{ isAdmin: true }`. It reuses `publicClient()` and dynamically imports `supabaseAdmin` exactly like `requireAdmin`.

**`src/components/brand/SiteHeader.tsx`**

- Imports: add `useServerFn` from `@tanstack/react-start`, `getIsAdmin` from `@/lib/admin.functions`, and `ShieldCheck` to the `lucide-react` import list.
- After `const isSignedIn = !!session;`, add `useState(false)` for `isAdmin`, `useServerFn(getIsAdmin)`, and a `useEffect` that calls `getIsAdminFn()` when `session` exists and updates `isAdmin` (cleaned up with a `mounted` flag).
- Desktop nav: render the Admin `<Link>` immediately after `<AccountNavLink isSignedIn={isSignedIn} />` when `isAdmin` is true, using the same style classes as Account but with `ShieldCheck` and "Admin" label.
- Mobile Sheet: inside the `isSignedIn ?` branch, render the Admin `<SheetClose asChild>` link immediately after the Account `<SheetClose>` link when `isAdmin` is true, using the matching mobile style classes.

No other files or logic are touched. The `requireAdmin` function and `/admin` route remain unchanged; server-side enforcement stays intact and the nav link is purely visibility.