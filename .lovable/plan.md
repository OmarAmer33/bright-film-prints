## Read-only admin order list

Add a server-side admin queue behind the existing `/admin` gate. Read-only, no writes. `requireAdmin`, `getIsAdmin`, and the session/gate logic in `admin.tsx` stay untouched.

### 1. `src/lib/admin.functions.ts` (edit — append only)
Append `assertAdmin()` exactly as specified: a plain (non-server-fn) async helper that reads the bearer token via `getRequest()`, validates it with `publicClient().auth.getClaims()`, checks `user_roles` via `supabaseAdmin`, throws `"Not authorized"` on any failure, returns `{ sub, email }` on success. `requireAdmin` and `getIsAdmin` are not modified.

### 2. `src/lib/admin.orders.functions.ts` (new)
New `createServerFn({ method: "GET" })` named `listAdminOrders`. Calls `await assertAdmin()`, dynamically imports `supabaseAdmin`, selects the specified columns from `orders` ordered by `created_at desc` limit 200, maps to `AdminOrderRow[]` (deriving `has_shipping` from `!!shipping_address`). Exports the `AdminOrderRow` type.

### 3. `src/routes/admin.tsx` (edit — only the ok-state render)
Leave session resolution, `requireAdmin` call, loading state, sign-in-required state, and not-authorized state exactly as-is. Replace only the current "Access granted" placeholder branch with a new `<AdminOrdersQueue email={...} />` component defined in the same file:

- Uses `useServerFn(listAdminOrders)` inside a `useEffect` (mounted-flag cleanup) with local `rows`, `loading`, `error` state.
- Renders heading "Orders" plus a subheading "Signed in as {email}".
- Loading: "Loading orders…". Empty: "No orders yet.". Error: neutral inline message.
- Table (newest first) with columns: Date (readable `created_at`), Order (first 8 chars of id, monospace), Customer (email), Status, Total (formatted `$`), Flags.
  - Status pill: neutral ink/stone for paid, in_production, printed, shipped, delivered, on_hold; `issue` uses `border-ember text-ember`.
  - Flags cell composes: `RUSH` when `is_rush`; `−$X redeemed` when `rewards_redeemed > 0`; `no ship-to` in ember when `!has_shipping`.
  - For rows with status `issue`, render a second row directly beneath spanning all columns with `notes` in small ember text.
- Styling uses existing brand tokens (paper/ink/line/stone/ember). Uses `@/components/ui/table` primitives if they exist in the project; otherwise a plain styled `<table>` with the same tokens. No row interactivity.

### Notes
- No changes to any other files, pricing, rewards, webhook, or the auth gate.
- No publish after build.
