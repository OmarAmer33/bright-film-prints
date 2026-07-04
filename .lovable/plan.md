## Admin gate: two new files, no other changes

### FILE 1 (new) — `src/lib/admin.functions.ts`

Server function `requireAdmin` that mirrors the auth mechanics of `resolveCustomerIdFromAuth` but throws instead of returning null, and checks `user_roles` instead of `customers`.

```ts
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const requireAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) throw new Error("Not authorized");
  const token = auth.slice("Bearer ".length).trim();
  if (token.split(".").length !== 3) throw new Error("Not authorized");

  const pub = publicClient();
  const { data: claimsRes, error: claimsErr } = await pub.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims?.sub) throw new Error("Not authorized");
  const sub = claimsRes.claims.sub as string;
  const email = (claimsRes.claims.email as string | undefined) ?? null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("user_id", sub)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !row) throw new Error("Not authorized");

  return { ok: true as const, email };
});
```

Every failure path throws `"Not authorized"`; success is the only route to `ok: true`.

### FILE 2 (new) — `src/routes/admin.tsx`

Client-rendered route at `/admin`. Session UX mirrors `src/routes/account.tsx` (SiteHeader/SiteFooter, `supabase.auth.getSession` + `onAuthStateChange`, `head()` with `robots: noindex, nofollow`). Invocation uses `useServerFn(requireAdmin)` — same pattern `cart.tsx` uses for `createCheckout` — so the Bearer attacher middleware forwards the token unchanged.

State machine:
- session unresolved → "Loading…" card
- no session → "Admin access requires sign-in." card with `<Link to="/account">`
- session present → call `requireAdmin()` in an effect; on resolve render `<h1>Admin</h1>` + "Access granted — signed in as {email}."; on throw render "Not authorized — this account does not have admin access." card with `<Link to="/">` back to home

No order/customer data fetched or rendered. No other files touched.

### Verification

After build, hit `/admin`:
- Signed out → sign-in card
- Signed in as non-admin → not-authorized card (server throws)
- Signed in as `omar@priklpay.com` (admin) → "Access granted" + email

No publish.