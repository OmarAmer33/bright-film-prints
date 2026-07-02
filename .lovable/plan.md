One-file change in `src/components/brand/SiteHeader.tsx` only.

1. Remove the static `{ to: "/account", label: "Account" }` entry from the `nav` array so the array ends at Contact.
2. Add a new `AccountNavLink` component in the same file using `useEffect`/`useState` to watch `supabase.auth.onAuthStateChange` and display:
   - "Account" when a session exists
   - "Sign in" when logged out
3. Render `<AccountNavLink />` as the last child of the existing `<nav aria-label="Primary">` element, immediately after the `{nav.map(...)}` block, so it matches the existing link styling.

No other file, route, server function, migration, or DB change will be touched. After approval I will make the edit and publish.