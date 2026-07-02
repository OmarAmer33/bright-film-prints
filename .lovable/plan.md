## Step 13.5.0 — Customer accounts (sign up / in / out + /account)

Additive only. No changes to checkout, webhook, pricing, order_items, schema, or migrations. Guest checkout stays intact.

### Files

**New**
- `src/routes/account.tsx` — single route with two client-only views (logged-out card + logged-in dashboard). SSR-safe: auth read in `useEffect`, kept fresh via `supabase.auth.onAuthStateChange`.

**Edit**
- `src/components/brand/SiteHeader.tsx` — add one "Account" nav link (routes to `/account` in all states), styled to match existing nav links.

**Auth config (tool call, no code)**
- `supabase--configure_auth` with `auto_confirm_email: true` so new email/password signups get a session immediately. I'll flag this in the final message so you can re-enable confirmation before launch. `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true`.

### /account page behavior

- Uses browser `supabase` client from `@/integrations/supabase/client` only. No server functions, no loader auth. No `requireSupabaseAuth`.
- `useEffect`: `supabase.auth.getSession()` → set state; subscribe to `onAuthStateChange` → update state; unsubscribe on unmount. Renders a lightweight skeleton until first read resolves.
- **Logged out** — Card with a `Tabs` toggle "Sign in" / "Create account":
  - Sign in: email + password → `supabase.auth.signInWithPassword`.
  - Create account: optional name, email, password (min 8) → `supabase.auth.signUp({ email, password, options: { data: { name } } })`. With auto-confirm on, the returned session logs the user in immediately; `handle_new_user` trigger creates the `customers` row (with name) and the `customer` `user_roles` entry.
  - Friendly inline error text on failure; disabled button + spinner while pending.
- **Logged in** — three sections:
  1. Greeting: name (from `customers.name` if present, else `user.user_metadata.name`, else email).
  2. Rewards balance: `supabase.from('customers').select('rewards_balance').eq('auth_user_id', user.id).maybeSingle()` → `Rewards balance: $X.XX`. Falls back to `$0.00` if row still propagating.
  3. Order history: `supabase.from('orders').select('id, created_at, status, total, view_token').order('created_at', { ascending: false }).limit(25)` — RLS `orders read own` scopes to the caller's customer row. Renders table/list with a `<Link to="/orders/$token" params={{ token }}>View</Link>`.
  4. Sign out button → `supabase.auth.signOut()`; the auth listener flips the UI to logged-out inline (no navigation).
- Head metadata: title "Your account — Bright Transfers", meta description, og:title/description, `robots: noindex, nofollow` (private).

### Header

Insert `{ to: "/account", label: "Account" }` into the existing `nav` array in `SiteHeader.tsx`. No visibility toggle by auth state — the requirement is a single link in both states.

### Not touching
- `src/lib/checkout.functions.ts`, `src/routes/api/public/stripe.webhook.ts`, `src/lib/pricing-core.ts`, `src/lib/orders.functions.ts`, `src/routes/orders.$token.tsx`, any migration in `supabase/migrations/`, and the DB schema. `handle_new_user` trigger + existing RLS policies (`customers read own`, `orders read own`) are already in place — I'll rely on them, not modify them.

### After build

1. Report files changed and confirm checkout/webhook/schema untouched.
2. Note the `auto_confirm_email: true` toggle and where to flip it back.
3. Publish.
