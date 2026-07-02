## Frontend-only fix to `src/components/brand/SiteHeader.tsx`

Single-file change. No backend, routing, auth-logic, cart, checkout, or token changes.

### 1. One shared auth listener
- Add a small `useAuthSession()` helper at the bottom of the file: on mount call `supabase.auth.getSession()`, subscribe with `supabase.auth.onAuthStateChange`, unsubscribe on unmount. Returns `session`.
- Call it once inside `SiteHeader` and derive `const isSignedIn = !!session`.
- Remove the `useEffect`/subscription currently inside `AccountNavLink`. `AccountNavLink` becomes a pure presentational component that receives `isSignedIn` as a prop (used by the desktop `<nav>`). The mobile menu renders its own inline account row using the same `isSignedIn`.

### 2. Desktop account affordance (unchanged breakpoint, new visuals)
- Signed OUT → outlined pill: `inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-ink/5` with `<LogIn className="h-4 w-4" />` before "Sign in". Links to `/account`.
- Signed IN → `inline-flex items-center gap-1.5 text-sm font-medium text-ink` with `<CircleUserRound className="h-4 w-4 text-sun" />` before "Account". Links to `/account`.
- Both use `lucide-react` icons already available in the project.

### 3. Mobile menu (below md)
- Add a hamburger `<SheetTrigger asChild>` button placed inside the right-hand action cluster, before `CartLink`, with `className="md:hidden ..."` matching the existing pill/outline styling (`inline-flex items-center justify-center rounded-pill border border-line bg-paper p-2 text-ink`), `aria-label="Open menu"`, containing `<Menu className="h-5 w-5" />`.
- Imports from `@/components/ui/sheet`: `Sheet, SheetTrigger, SheetContent, SheetClose, SheetHeader, SheetTitle`.
- `<SheetContent side="right" className="bg-paper">` contains:
  - `SheetHeader` with `SheetTitle` "Menu" (font-display text-ink).
  - Account row at top:
    - Signed IN: `SheetClose asChild` → `<Link to="/account">` styled as a pill row with `CircleUserRound` (sun accent) + "Account".
    - Signed OUT: `SheetClose asChild` → `<Link to="/account">` styled as filled `bg-ink text-paper rounded-pill px-4 py-2 font-bold` with `LogIn` icon + "Sign in".
  - A vertical stacked list of the existing `nav` array (How it works, Pricing, FAQ, About, Contact) — each wrapped in `SheetClose asChild` with `<Link>` using `text-base font-medium text-ink/80 hover:text-ink` and a divider line above (`border-t border-line/70`).
- Sheet open state is controlled by a local `useState` so `SheetClose` closes on navigation.

### 4. Untouched
- Logo/home link, `CartLink`, "Start order" pill (all visible at every breakpoint).
- Desktop `<nav>` remains `hidden md:flex` with the same primary links; only `AccountNavLink` visuals change per step 2.
- No new colors/fonts introduced — only existing tokens (`paper`, `ink`, `line`, `sun`, `ember`, `rounded-pill`, `font-display`, `font-medium`).

### Accessibility
- Hamburger has `aria-label="Open menu"`.
- Sheet always renders `SheetTitle` ("Menu") for screen readers.

### After building
- Publish.
